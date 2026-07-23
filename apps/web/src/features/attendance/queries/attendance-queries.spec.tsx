import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { createAttendanceFactory } from '@/test/factories/attendance.factory';
import * as React from 'react';

jest.mock('@/api/generated/endpoints', () => ({
  attendanceQueryControllerGetMyAttendance: jest.fn(),
  attendanceQueryControllerFindAll: jest.fn(),
  attendanceQueryControllerCheckedInToday: jest.fn(),
  attendanceCommandControllerCheckAttendanceFromWeb: jest.fn(),
  attendanceQueryControllerGetPresence: jest.fn(),
  attendanceQueryControllerGetPresenceSummary: jest.fn(),
  departmentsControllerFindList: jest.fn(),
}));

const {
  attendanceQueryControllerGetMyAttendance,
  attendanceQueryControllerFindAll,
  attendanceCommandControllerCheckAttendanceFromWeb,
} = jest.requireMock('@/api/generated/endpoints');

const attendance = createAttendanceFactory();

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

describe('useMyMonthAttendanceQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (attendanceQueryControllerGetMyAttendance as jest.Mock).mockResolvedValue({
      data: {
        data: [attendance],
        meta: { pagination: { page: 1, limit: 31, total: 1, hasNext: false } },
        error: null,
      },
      status: 200,
      headers: new Headers(),
    });
  });

  it('fetches my attendance list', async () => {
    const { useMyMonthAttendanceQuery } = await import('./attendance-queries');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useMyMonthAttendanceQuery({ month: '2026-07' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.attendances).toHaveLength(1);
    expect(result.current.data?.attendances[0].date).toBe(attendance.date);
    expect(attendanceQueryControllerGetMyAttendance).toHaveBeenCalledTimes(1);
  });

  it('handles empty month', async () => {
    (attendanceQueryControllerGetMyAttendance as jest.Mock).mockResolvedValue({
      data: { data: [], meta: { pagination: { page: 1, limit: 31, total: 0, hasNext: false } }, error: null },
      status: 200,
      headers: new Headers(),
    });

    const { useMyMonthAttendanceQuery } = await import('./attendance-queries');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useMyMonthAttendanceQuery({ month: '2026-08' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.attendances).toHaveLength(0);
  });

  it('handles API error', async () => {
    (attendanceQueryControllerGetMyAttendance as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { useMyMonthAttendanceQuery } = await import('./attendance-queries');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useMyMonthAttendanceQuery({ month: '2026-07' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('extracts pagination meta', async () => {
    (attendanceQueryControllerGetMyAttendance as jest.Mock).mockResolvedValue({
      data: {
        data: [attendance],
        meta: { pagination: { page: 1, limit: 31, total: 15, hasNext: true } },
        error: null,
      },
      status: 200,
      headers: new Headers(),
    });

    const { useMyMonthAttendanceQuery } = await import('./attendance-queries');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useMyMonthAttendanceQuery({ month: '2026-07' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pagination?.total).toBe(15);
    expect(result.current.data?.pagination?.hasNext).toBe(true);
  });
});

describe('useAttendancesQuery (admin)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (attendanceQueryControllerFindAll as jest.Mock).mockResolvedValue({
      data: {
        data: [attendance],
        meta: { pagination: { page: 1, limit: 10, total: 1, hasNext: false } },
        error: null,
      },
      status: 200,
      headers: new Headers(),
    });
  });

  it('fetches all attendance records', async () => {
    const { useAttendancesQuery } = await import('./attendance-queries');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useAttendancesQuery({ page: 1, limit: 10 }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.records).toHaveLength(1);
  });
});

describe('useCheckAttendanceMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (attendanceCommandControllerCheckAttendanceFromWeb as jest.Mock).mockResolvedValue({
      data: { success: true },
      status: 200,
      headers: new Headers(),
    });
  });

  it('checks in successfully', async () => {
    const { useCheckAttendanceMutation } = await import('./attendance-queries');
    const { qc, Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useCheckAttendanceMutation(qc),
      { wrapper: Wrapper },
    );

    result.current.mutate({
      body: { date: '2026-07-22', session: 'MORNING', type: 'CHECK_IN' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(attendanceCommandControllerCheckAttendanceFromWeb).toHaveBeenCalledTimes(1);
  });

  it('sends idempotency key', async () => {
    const { useCheckAttendanceMutation } = await import('./attendance-queries');
    const { qc, Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useCheckAttendanceMutation(qc),
      { wrapper: Wrapper },
    );

    result.current.mutate({
      body: { date: '2026-07-22', session: 'MORNING', type: 'CHECK_IN' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const callArgs = (attendanceCommandControllerCheckAttendanceFromWeb as jest.Mock).mock.calls[0];
    expect(callArgs[1]?.headers?.['Idempotency-Key']).toBeDefined();
  });

  it('handles check-in error', async () => {
    (attendanceCommandControllerCheckAttendanceFromWeb as jest.Mock).mockRejectedValue(
      new Error('Already checked in'),
    );

    const { useCheckAttendanceMutation } = await import('./attendance-queries');
    const { qc, Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useCheckAttendanceMutation(qc),
      { wrapper: Wrapper },
    );

    result.current.mutate({
      body: { date: '2026-07-22', session: 'MORNING', type: 'CHECK_IN' },
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
