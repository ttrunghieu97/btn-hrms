import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

jest.mock('@/api/generated/endpoints', () => ({
  attendanceQueryControllerGetPresence: jest.fn(),
  attendanceQueryControllerGetPresenceSummary: jest.fn(),
  departmentsControllerFindList: jest.fn(),
}));

const {
  attendanceQueryControllerGetPresence,
  attendanceQueryControllerGetPresenceSummary,
} = jest.requireMock('@/api/generated/endpoints');

const mockPresenceItem = {
  employeeId: 'emp-1',
  employeeCode: 'EMP001',
  fullName: 'Nguyen Van A',
  departmentName: 'Engineering',
  position: 'Software Engineer',
  status: 'ACTIVE',
  checkInAt: '08:00',
  workingDurationSeconds: 28800,
  shiftName: 'Morning',
};

const mockSummary = {
  data: {
    active: 10,
    break: 2,
    upcoming: 5,
    absent: 1,
    leave: 3,
    offDuty: 4,
  },
};

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('usePresenceListQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (attendanceQueryControllerGetPresence as jest.Mock).mockResolvedValue({
      data: { data: [mockPresenceItem], error: null },
      status: 200,
      headers: new Headers(),
    });
  });

  it('fetches presence list', async () => {
    const { usePresenceListQuery } = await import('./attendance-queries');
    const { result } = renderHook(
      () => usePresenceListQuery('dept-1', 'ACTIVE'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(attendanceQueryControllerGetPresence).toHaveBeenCalledWith({
      departmentId: 'dept-1',
      status: 'ACTIVE',
    });
  });

  it('handles empty department filter', async () => {
    const { usePresenceListQuery } = await import('./attendance-queries');
    const { result } = renderHook(
      () => usePresenceListQuery(),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(attendanceQueryControllerGetPresence).toHaveBeenCalledWith({
      departmentId: undefined,
      status: undefined,
    });
  });
});

describe('usePresenceSummaryQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (attendanceQueryControllerGetPresenceSummary as jest.Mock).mockResolvedValue({
      data: mockSummary,
      status: 200,
      headers: new Headers(),
    });
  });

  it('fetches presence summary', async () => {
    const { usePresenceSummaryQuery } = await import('./attendance-queries');
    const { result } = renderHook(
      () => usePresenceSummaryQuery('dept-1'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(attendanceQueryControllerGetPresenceSummary).toHaveBeenCalledWith({
      departmentId: 'dept-1',
    });
  });
});
