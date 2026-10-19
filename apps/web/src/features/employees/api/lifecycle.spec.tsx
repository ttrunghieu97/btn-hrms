/**
 * Employee lifecycle mutation tests.
 * Covers status transitions, error handling, and cache invalidation.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

jest.mock('@/lib/fetcher', () => ({
  customFetch: jest.fn(),
}));

const { customFetch } = jest.requireMock('@/lib/fetcher');

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    qc,
    Wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children),
  };
}

describe('useChangeEmployeeStatusMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (customFetch as jest.Mock).mockResolvedValue({
      data: { success: true, status: 'working' },
      status: 200,
      headers: new Headers(),
    });
  });

  it('completes valid transition: draft → probation', async () => {
    const { useChangeEmployeeStatusMutation } = await import(
      '../../employees/queries/employee-queries'
    );
    const { qc, Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useChangeEmployeeStatusMutation(qc),
      { wrapper: Wrapper },
    );

    result.current.mutate({ id: 'emp-1', status: 'probation' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(customFetch).toHaveBeenCalledWith(
      '/api/v1/employees/emp-1/change-status',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"status":"probation"'),
      }),
    );
  });

  it('completes valid transition: working → terminated', async () => {
    const { useChangeEmployeeStatusMutation } = await import(
      '../../employees/queries/employee-queries'
    );
    const { qc, Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useChangeEmployeeStatusMutation(qc),
      { wrapper: Wrapper },
    );

    result.current.mutate({ id: 'emp-1', status: 'terminated', reason: 'Resigned' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(customFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"reason":"Resigned"'),
      }),
    );
  });

  it('handles invalid transition rejected by API', async () => {
    (customFetch as jest.Mock).mockRejectedValue(new Error('Invalid transition: terminated → working'));

    const { useChangeEmployeeStatusMutation } = await import(
      '../../employees/queries/employee-queries'
    );
    const { qc, Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useChangeEmployeeStatusMutation(qc),
      { wrapper: Wrapper },
    );

    result.current.mutate({ id: 'emp-1', status: 'working' });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('preserves cache on error (rollback)', async () => {
    // Set up initial cache
    (customFetch as jest.Mock).mockRejectedValue(new Error('Transition rejected'));

    const { useChangeEmployeeStatusMutation, employeeKeys } = await import(
      '../../employees/queries/employee-queries'
    );
    const { qc, Wrapper } = createWrapper();

    // Seed cache with employee
    qc.setQueryData(employeeKeys.detail('emp-1'), {
      id: 'emp-1',
      status: 'working',
      firstName: 'Test',
    });

    const { result } = renderHook(
      () => useChangeEmployeeStatusMutation(qc),
      { wrapper: Wrapper },
    );

    result.current.mutate({ id: 'emp-1', status: 'terminated' });
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should still show original status (rolled back)
    const cached = qc.getQueryData(employeeKeys.detail('emp-1')) as any;
    expect(cached?.status).toBe('working');
  });

  it('validates canonical 6-value employeeStatusSchema and maps getSmartStatus / getEmployeeStatusLabel', async () => {
    const { employeeStatusSchema } = await import('../schemas/employee.schema');
    const { getSmartStatus, getEmployeeStatusLabel } = await import('../utils/employee-status');

    const canonicalStatuses = [
      'working',
      'probation',
      'terminated',
      'leave',
      'suspended',
      'retired',
    ] as const;

    for (const status of canonicalStatuses) {
      expect(employeeStatusSchema.safeParse(status).success).toBe(true);
      const smart = getSmartStatus({ status });
      expect(smart.kind).toBe(status);
      expect(smart.label).toBe(getEmployeeStatusLabel(status));
      expect(smart.label.length).toBeGreaterThan(0);
    }

    // Legacy / non-canonical uppercase values must be rejected by employeeStatusSchema
    for (const invalid of ['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'ARCHIVED']) {
      expect(employeeStatusSchema.safeParse(invalid).success).toBe(false);
      expect(getSmartStatus({ status: invalid }).kind).toBe('unknown');
    }
  });
});
