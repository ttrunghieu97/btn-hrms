import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { createEmployeeFactory } from '@/test/factories/employee.factory';
import * as React from 'react';

// Mock the generated endpoint
jest.mock('@/api/generated/endpoints', () => ({
  employeesControllerFindAll: jest.fn(),
  employeesControllerFindOne: jest.fn(),
}));

const { employeesControllerFindAll, employeesControllerFindOne } =
  jest.requireMock('@/api/generated/endpoints');

const employee = createEmployeeFactory();

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('employeesQueryOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches employee list', async () => {
    (employeesControllerFindAll as jest.Mock).mockResolvedValue({
      data: {
        data: [employee],
        meta: { pagination: { page: 1, limit: 10, total: 1, hasNext: false } },
        error: null,
      },
      status: 200,
      headers: new Headers(),
    });

    const { employeesQueryOptions } = await import('./queries');
    const { result } = renderHook(
      () => useQuery(employeesQueryOptions({ page: 1, limit: 10 })),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.employees).toHaveLength(1);
    expect(result.current.data?.employees[0].id).toBe(employee.id);
    expect(employeesControllerFindAll).toHaveBeenCalledTimes(1);
  });

  it('handles API error', async () => {
    (employeesControllerFindAll as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { employeesQueryOptions } = await import('./queries');
    const { result } = renderHook(
      () => useQuery(employeesQueryOptions({ page: 1, limit: 10 })),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('returns empty list for empty response', async () => {
    (employeesControllerFindAll as jest.Mock).mockResolvedValue({
      data: { data: [], meta: { pagination: { page: 1, limit: 10, total: 0, hasNext: false } }, error: null },
      status: 200,
      headers: new Headers(),
    });

    const { employeesQueryOptions } = await import('./queries');
    const { result } = renderHook(
      () => useQuery(employeesQueryOptions({ page: 1, limit: 10 })),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.employees).toHaveLength(0);
  });
});
