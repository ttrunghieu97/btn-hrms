import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createEmployeeFactory } from '@/test/factories/employee.factory';
import * as React from 'react';

jest.mock('@/api/generated/endpoints', () => ({
  employeesControllerCreate: jest.fn(),
  employeesControllerUpdate: jest.fn(),
  employeeAdminControllerResetPassword: jest.fn(),
  employeesControllerFindAll: jest.fn(),
}));

const { employeesControllerCreate, employeesControllerUpdate, employeeAdminControllerResetPassword } =
  jest.requireMock('@/api/generated/endpoints');

const employee = createEmployeeFactory();

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

describe('useCreateEmployeeMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (employeesControllerCreate as jest.Mock).mockResolvedValue({
      data: { data: employee, error: null },
      status: 201,
      headers: new Headers(),
    });
  });

  it('creates employee successfully', async () => {
    const { useCreateEmployeeMutation } = await import('../../employees/queries/employee-queries');
    const { qc, Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useCreateEmployeeMutation(qc),
      { wrapper: Wrapper },
    );

    const vars = { firstName: 'Test', lastName: 'User', email: 'test@example.com' };
    result.current.mutate(vars);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(employeesControllerCreate).toHaveBeenCalled();
  });

  it('handles API error', async () => {
    (employeesControllerCreate as jest.Mock).mockRejectedValue(new Error('Validation failed'));

    const { useCreateEmployeeMutation } = await import('../../employees/queries/employee-queries');
    const { qc, Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useCreateEmployeeMutation(qc),
      { wrapper: Wrapper },
    );

    result.current.mutate({ firstName: '', lastName: '', email: '' });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUpdateEmployeeMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (employeesControllerUpdate as jest.Mock).mockResolvedValue({
      data: { data: employee, error: null },
      status: 200,
      headers: new Headers(),
    });
  });

  it('updates employee successfully', async () => {
    const { useUpdateEmployeeMutation } = await import('../../employees/queries/employee-queries');
    const { qc, Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useUpdateEmployeeMutation(qc),
      { wrapper: Wrapper },
    );

    result.current.mutate({ id: 'emp-1', data: { firstName: 'Updated' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(employeesControllerUpdate).toHaveBeenCalledWith('emp-1', expect.any(Object));
  });

  it('handles not-found error', async () => {
    (employeesControllerUpdate as jest.Mock).mockRejectedValue(new Error('Not found'));

    const { useUpdateEmployeeMutation } = await import('../../employees/queries/employee-queries');
    const { qc, Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useUpdateEmployeeMutation(qc),
      { wrapper: Wrapper },
    );

    result.current.mutate({ id: 'not-found', data: { firstName: 'Updated' } });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useResetEmployeePasswordMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (employeeAdminControllerResetPassword as jest.Mock).mockResolvedValue({
      data: {
        data: {
          success: true,
          username: 'employee1',
          password: null,
          temporaryPasswordIssued: true,
          resetRequired: true,
        },
        error: null,
      },
      status: 200,
      headers: new Headers(),
    });
  });

  it('resets password successfully', async () => {
    const { useResetEmployeePasswordMutation } = await import('../../employees/queries/employee-queries');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useResetEmployeePasswordMutation(),
      { wrapper: Wrapper },
    );

    result.current.mutate('emp-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.temporaryPasswordIssued).toBe(true);
    expect(employeeAdminControllerResetPassword).toHaveBeenCalledWith('emp-1');
  });

  it('handles forbidden error', async () => {
    (employeeAdminControllerResetPassword as jest.Mock).mockRejectedValue(
      new Error('Forbidden: insufficient permissions'),
    );

    const { useResetEmployeePasswordMutation } = await import('../../employees/queries/employee-queries');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useResetEmployeePasswordMutation(),
      { wrapper: Wrapper },
    );

    result.current.mutate('emp-1');
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
