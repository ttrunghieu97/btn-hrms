import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import * as React from 'react';

jest.mock('@/lib/fetcher', () => ({
  customFetch: jest.fn(),
}));

const { customFetch } = jest.requireMock('@/lib/fetcher');

const contractRows = [
  {
    id: 'contract-1',
    employeeId: 'emp-1',
    employeeName: 'Nguyen Van 1',
    employeeCode: 'EMP001',
    departmentName: 'Engineering',
    contractNumber: 'HD-001',
    contractType: 'permanent',
    status: 'active',
    version: 1,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
  },
];

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useContractsListQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (customFetch as jest.Mock).mockResolvedValue({
      data: {
        data: contractRows,
        meta: { pagination: { total: 1, page: 1, limit: 10, hasNext: false } },
      },
      status: 200,
      headers: new Headers(),
    });
  });

  it('fetches contracts list', async () => {
    const { useContractsListQuery } = await import('./contract-queries');
    const { result } = renderHook(
      () => useContractsListQuery({ page: 1, limit: 10 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data;
    expect(data?.data as any).toBeDefined();
    expect(customFetch).toHaveBeenCalled();
  });

  it('returns empty list when no contracts', async () => {
    (customFetch as jest.Mock).mockResolvedValue({
      data: {
        data: [],
        meta: { pagination: { total: 0, page: 1, limit: 10, hasNext: false } },
      },
      status: 200,
      headers: new Headers(),
    });

    const { useContractsListQuery } = await import('./contract-queries');
    const { result } = renderHook(
      () => useContractsListQuery({ page: 1, limit: 10 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const envelope = (result.current.data as any)?.data;
    expect(Array.isArray(envelope?.data)).toBe(true);
    expect(envelope.data).toHaveLength(0);
  });

  it('handles API error', async () => {
    (customFetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { useContractsListQuery } = await import('./contract-queries');
    const { result } = renderHook(
      () => useContractsListQuery({ page: 1, limit: 10 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
