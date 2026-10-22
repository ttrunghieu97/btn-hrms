import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

jest.mock('@/lib/fetcher', () => ({ customFetch: jest.fn() }));
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

describe('learning mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('completes course enrollment via POST /api/v1/learning/enrollments/:id/complete', async () => {
    (customFetch as jest.Mock).mockResolvedValue({
      data: { id: 'enr-1', status: 'completed' },
      status: 200,
    });
    const { useCompleteCourseEnrollment } = await import('./mutations');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCompleteCourseEnrollment(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate('enr-1');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(customFetch).toHaveBeenCalledWith(
      '/api/v1/learning/enrollments/enr-1/complete',
      { method: 'POST' },
    );
  });

  it('assigns course to employees via POST /api/v1/learning/assignments', async () => {
    (customFetch as jest.Mock).mockResolvedValue({
      data: { assignedCount: 2 },
      status: 201,
    });
    const { useAssignCourse } = await import('./mutations');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAssignCourse(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate({
        courseId: 'c-1',
        employeeIds: ['emp-1', 'emp-2'],
        dueDate: '2026-12-31',
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(customFetch).toHaveBeenCalledWith(
      '/api/v1/learning/assignments',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('withdraws from session via POST /api/v1/learning/sessions/:id/withdraw', async () => {
    (customFetch as jest.Mock).mockResolvedValue({
      data: { id: 's-1', status: 'withdrawn' },
      status: 200,
    });
    const { useWithdrawSession } = await import('./mutations');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useWithdrawSession(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate({ id: 's-1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(customFetch).toHaveBeenCalledWith(
      '/api/v1/learning/sessions/s-1/withdraw',
      { method: 'POST' },
    );
  });

  it('issues, renews, and revokes employee certificates', async () => {
    (customFetch as jest.Mock).mockResolvedValue({
      data: { id: 'cert-1', status: 'active' },
      status: 200,
    });
    const {
      useIssueCertificate,
      useRenewCertificate,
      useRevokeCertificate,
    } = await import('./mutations');
    const { Wrapper } = createWrapper();

    const issueHook = renderHook(() => useIssueCertificate(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      issueHook.result.current.mutate({
        definitionId: 'def-1',
        employeeId: 'emp-1',
      });
    });
    await waitFor(() => expect(issueHook.result.current.isSuccess).toBe(true));
    expect(customFetch).toHaveBeenCalledWith(
      '/api/v1/learning/certifications/issue',
      expect.objectContaining({ method: 'POST' }),
    );

    const renewHook = renderHook(() => useRenewCertificate(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      renewHook.result.current.mutate('cert-1');
    });
    await waitFor(() => expect(renewHook.result.current.isSuccess).toBe(true));
    expect(customFetch).toHaveBeenCalledWith(
      '/api/v1/learning/certifications/cert-1/renew',
      { method: 'POST' },
    );

    const revokeHook = renderHook(() => useRevokeCertificate(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      revokeHook.result.current.mutate('cert-1');
    });
    await waitFor(() => expect(revokeHook.result.current.isSuccess).toBe(true));
    expect(customFetch).toHaveBeenCalledWith(
      '/api/v1/learning/certifications/cert-1/revoke',
      { method: 'POST' },
    );
  });

  it('assigns and completes learning paths', async () => {
    (customFetch as jest.Mock).mockResolvedValue({
      data: { id: 'path-1', status: 'completed' },
      status: 200,
    });
    const { useAssignLearningPath, useCompleteLearningPath } = await import(
      './mutations'
    );
    const { Wrapper } = createWrapper();

    const assignHook = renderHook(() => useAssignLearningPath(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      assignHook.result.current.mutate({
        pathId: 'path-1',
        employeeIds: ['emp-1'],
      });
    });
    await waitFor(() => expect(assignHook.result.current.isSuccess).toBe(true));
    expect(customFetch).toHaveBeenCalledWith(
      '/api/v1/learning/paths/assign',
      expect.objectContaining({ method: 'POST' }),
    );

    const completeHook = renderHook(() => useCompleteLearningPath(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      completeHook.result.current.mutate('path-1');
    });
    await waitFor(() =>
      expect(completeHook.result.current.isSuccess).toBe(true),
    );
    expect(customFetch).toHaveBeenCalledWith(
      '/api/v1/learning/paths/path-1/complete',
      { method: 'POST' },
    );
  });
});
