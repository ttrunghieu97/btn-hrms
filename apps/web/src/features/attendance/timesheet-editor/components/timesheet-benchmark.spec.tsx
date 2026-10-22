import * as React from 'react';
import { render, renderHook, waitFor, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DetailSheet } from './detail-sheet';
import { useTimesheet } from '../hooks/use-timesheet';
import { computeMonthStats } from '../kpi-summary';
import { showToast } from '@/lib/toast';
import {
  timekeepingControllerGetTimesheetWorkspace,
  timekeepingControllerOverrideAttendanceSummary,
  timekeepingControllerVerifyEmployee,
  timekeepingControllerUnverifyEmployee,
} from '@/api/generated/attendance-timekeeping/attendance-timekeeping';
import type {
  TimesheetWorkspaceEmployee,
  TimesheetWorkspaceRecord,
} from '../types';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let currentSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/attendance',
  useSearchParams: () => currentSearchParams,
}));

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

jest.mock('@/lib/toast', () => ({
  showToast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock(
  '@/api/generated/attendance-timekeeping/attendance-timekeeping',
  () => ({
    timekeepingControllerGetTimesheetWorkspace: jest.fn(),
    timekeepingControllerOverrideAttendanceSummary: jest.fn(),
    timekeepingControllerVerifyEmployee: jest.fn(),
    timekeepingControllerUnverifyEmployee: jest.fn(),
  }),
);

const mockGetWorkspace =
  timekeepingControllerGetTimesheetWorkspace as jest.Mock;
const mockOverrideSummary =
  timekeepingControllerOverrideAttendanceSummary as jest.Mock;
const mockVerifyEmployee = timekeepingControllerVerifyEmployee as jest.Mock;
const mockUnverifyEmployee = timekeepingControllerUnverifyEmployee as jest.Mock;

function buildDataset(employeeCount = 100, period = '2026-10') {
  const employees: TimesheetWorkspaceEmployee[] = Array.from(
    { length: employeeCount },
    (_, idx) => {
      const num = String(idx + 1).padStart(3, '0');
      return {
        id: `emp-${num}`,
        employeeCode: `NV${num}`,
        fullName: `Nhân Viên ${num}`,
        departmentName: `Phòng Ban ${(idx % 5) + 1}`,
        workingDays: 22,
        totalDays: 31,
        completionRate: 100,
        lateCount: 0,
        leaveCount: 0,
        absentCount: 0,
        otMinutes: 0,
        workedMinutes: 10560,
        verificationStatus: idx % 3 === 0 ? 'done' : 'draft',
      };
    },
  );

  const records: TimesheetWorkspaceRecord[] = [];
  for (const emp of employees) {
    for (let d = 1; d <= 31; d++) {
      const wd = `${period}-${String(d).padStart(2, '0')}`;
      records.push({
        employeeId: emp.id,
        workDate: wd,
        status: 'present',
        checkIn: `${wd}T08:00:00.000Z`,
        checkOut: `${wd}T17:00:00.000Z`,
        checkInMorning: '08:00',
        checkOutMorning: '12:00',
        checkInAfternoon: '13:00',
        checkOutAfternoon: '17:00',
        breakMinutes: 60,
        personalBreakMinutes: 0,
        lunchDutyMinutes: d % 5 === 0 ? 60 : 0,
        duty30kMinutes: 0,
        workedMinutes: 480,
        scheduledMinutes: 480,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: d % 4 === 0 ? 60 : 0,
        nightShiftDutyCount: d % 7 === 0 ? 1 : 0,
        waterBoothDutyCount: 0,
        isHoliday: false,
        note: d % 6 === 0 ? `Ghi chú ngày ${d}` : null,
      });
    }
  }

  return { employees, records, period };
}

describe('DetailSheet 18-Column Grid, URL Sync, Autosave & Concurrency Hardening', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockOverrideSummary.mockReset();
    mockOverrideSummary.mockResolvedValue({ data: { ok: true } });
    mockVerifyEmployee.mockReset();
    mockUnverifyEmployee.mockReset();
    (showToast.success as jest.Mock).mockClear();
    (showToast.error as jest.Mock).mockClear();
    (showToast.warning as jest.Mock).mockClear();
    (showToast.info as jest.Mock).mockClear();
    currentSearchParams = new URLSearchParams();
    window.history.replaceState(null, '', '/attendance');
  });

  it('preserves 18 columns, avoids RSC router pushes on employee switch, supports popstate, and isolates cell edits', () => {
    const { employees, records, period } = buildDataset(100, '2026-10');

    const byEmp = new Map<string, Map<string, TimesheetWorkspaceRecord>>();
    for (const r of records) {
      let m = byEmp.get(r.employeeId);
      if (!m) {
        m = new Map();
        byEmp.set(r.employeeId, m);
      }
      m.set(r.workDate, r);
    }

    for (let i = 0; i < 10; i++) {
      const emp = employees[i]!;
      expect(computeMonthStats(byEmp.get(emp.id)!, period, emp)).toEqual(
        computeMonthStats(records, period, emp),
      );
    }

    let commitCount = 0;
    const onRender: React.ProfilerOnRenderCallback = () => {
      commitCount++;
    };

    const { container } = render(
      <React.Profiler id="DetailSheet" onRender={onRender}>
        <DetailSheet
          period={period}
          employees={employees}
          records={records}
          canEdit={true}
          canTogglePeriodStatus={true}
          periodStatus="open"
        />
      </React.Profiler>,
    );

    // 1. Verify 18-column grid invariant & no sticky header backdrop-blur
    expect(container.querySelectorAll('colgroup col')).toHaveLength(18);
    const firstRowCells = container.querySelectorAll('tbody tr:first-child td');
    expect(firstRowCells).toHaveLength(18);
    expect(
      container.querySelectorAll('thead th.backdrop-blur-xs'),
    ).toHaveLength(0);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(window.location.search).toBe('?employeeId=NV001');

    // Simulate Next.js searchParams staying at NV001 while switching employees via shallow History API
    currentSearchParams = new URLSearchParams('employeeId=NV001');

    // 2. Switch across 10 employees and verify 1 commit per switch, 0 router.push calls, no state reversion
    for (let i = 1; i <= 10; i++) {
      const targetEmp = employees[i]!;
      const prevCommits = commitCount;

      act(() => {
        const btn = container.querySelector(
          `#emp-item-${targetEmp.id}`,
        ) as HTMLButtonElement | null;
        btn?.click();
      });

      expect(commitCount - prevCommits).toBe(1);
      expect(window.location.search).toBe(
        `?employeeId=${targetEmp.employeeCode}`,
      );
    }

    expect(mockPush).not.toHaveBeenCalled();
    const activeSidebarItem = container.querySelector('#emp-item-emp-011');
    expect(activeSidebarItem?.className).toContain('bg-accent');

    // 3. Verify browser Back/Forward (popstate) restores employee from URL
    act(() => {
      window.history.replaceState(null, '', '/attendance?employeeId=NV003');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(container.querySelector('#emp-item-emp-003')?.className).toContain(
      'bg-accent',
    );

    // 4. Verify cell edit, keyboard Enter navigation, Undo (Ctrl+Z), and Redo (Ctrl+Y)
    const rows = container.querySelectorAll('tbody tr');
    const row1TimeCell = rows[0]
      ?.querySelectorAll('td')[2]
      ?.querySelector('[role="button"]') as HTMLElement;

    act(() => {
      fireEvent.doubleClick(row1TimeCell);
    });

    const input = rows[0]
      ?.querySelectorAll('td')[2]
      ?.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();

    act(() => {
      fireEvent.change(input, { target: { value: '09:00' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(rows[0]?.querySelectorAll('td')[2]?.textContent).toContain('09:00');
    expect(rows[0]?.querySelectorAll('td')[2]?.className).toContain(
      'excel-cell-dirty',
    );
    expect(rows[1]?.querySelectorAll('td')[2]?.className).toContain(
      'excel-active-cell',
    );

    // Undo (Ctrl+Z) restores 08:00
    act(() => {
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    });
    expect(rows[0]?.querySelectorAll('td')[2]?.textContent).toContain('08:00');

    // Redo (Ctrl+Y) re-applies 09:00
    act(() => {
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    });
    expect(rows[0]?.querySelectorAll('td')[2]?.textContent).toContain('09:00');
  });

  it('handles deep-link initialization, invalid employee fallback, and preserves unrelated query params', () => {
    const { employees, records, period } = buildDataset(10, '2026-10');

    // Deep-link with valid employeeId and unrelated query params
    currentSearchParams = new URLSearchParams(
      'dept=IT&view=compact&employeeId=NV005',
    );
    window.history.replaceState(
      null,
      '',
      '/attendance?dept=IT&view=compact&employeeId=NV005',
    );

    const { container, unmount } = render(
      <DetailSheet
        period={period}
        employees={employees}
        records={records}
        canEdit={true}
        periodStatus="open"
      />,
    );

    expect(container.querySelector('#emp-item-emp-005')?.className).toContain(
      'bg-accent',
    );

    // Switch to NV002 and verify unrelated query params (dept=IT&view=compact) are preserved
    act(() => {
      const btn = container.querySelector(
        '#emp-item-emp-002',
      ) as HTMLButtonElement | null;
      btn?.click();
    });

    const paramsAfterSwitch = new URLSearchParams(window.location.search);
    expect(paramsAfterSwitch.get('employeeId')).toBe('NV002');
    expect(paramsAfterSwitch.get('dept')).toBe('IT');
    expect(paramsAfterSwitch.get('view')).toBe('compact');
    unmount();

    // Invalid employeeId falls back to NV001 with warning toast
    currentSearchParams = new URLSearchParams('employeeId=INVALID_999');
    window.history.replaceState(null, '', '/attendance?employeeId=INVALID_999');

    const { container: c2 } = render(
      <DetailSheet
        period={period}
        employees={employees}
        records={records}
        canEdit={true}
        periodStatus="open"
      />,
    );

    expect(showToast.warning).toHaveBeenCalledTimes(1);
    expect(c2.querySelector('#emp-item-emp-001')?.className).toContain(
      'bg-accent',
    );
    expect(window.location.search).toBe('?employeeId=NV001');
  });

  it('autosaves blurred and in-flight edits on employee/period switch, blocks switch on error, and deduplicates slow concurrent saves', async () => {
    const { employees, records, period } = buildDataset(10, '2026-10');
    const mockNavigatePeriod = jest.fn();

    const { container } = render(
      <DetailSheet
        period={period}
        employees={employees}
        records={records}
        canEdit={true}
        navigatePeriod={mockNavigatePeriod}
        periodStatus="open"
      />,
    );

    const rows = container.querySelectorAll('tbody tr');

    // Edit Day 1 via Enter, then edit Day 2 and directly click Employee 2 (blurring Day 2 in the same interaction)
    const day1Cell = rows[0]
      ?.querySelectorAll('td')[2]
      ?.querySelector('[role="button"]') as HTMLElement;
    act(() => {
      fireEvent.doubleClick(day1Cell);
    });
    const day1Input = rows[0]
      ?.querySelectorAll('td')[2]
      ?.querySelector('input') as HTMLInputElement;
    act(() => {
      fireEvent.change(day1Input, { target: { value: '08:15' } });
      fireEvent.keyDown(day1Input, { key: 'Enter' });
    });

    const day2Cell = rows[1]
      ?.querySelectorAll('td')[2]
      ?.querySelector('[role="button"]') as HTMLElement;
    act(() => {
      fireEvent.doubleClick(day2Cell);
    });
    const day2Input = rows[1]
      ?.querySelectorAll('td')[2]
      ?.querySelector('input') as HTMLInputElement;

    // Simulate slow network save across all chunk promises
    const resolvers: Array<() => void> = [];
    mockOverrideSummary.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(() => resolve({ data: { ok: true } }));
        }),
    );

    const emp2Btn = container.querySelector(
      '#emp-item-emp-002',
    ) as HTMLButtonElement;
    const emp3Btn = container.querySelector(
      '#emp-item-emp-003',
    ) as HTMLButtonElement;

    // User changes Day 2 input, blurs it by clicking emp2, and while save is in flight clicks emp3
    act(() => {
      fireEvent.change(day2Input, { target: { value: '08:30' } });
      fireEvent.blur(day2Input);
      emp2Btn.click();
      emp3Btn.click();
    });

    // Save was deduplicated: only 2 API calls total (for Day 1 and Day 2 of emp-001), NOT 4 calls!
    expect(mockOverrideSummary).toHaveBeenCalledTimes(2);
    // While save is in flight, employee has NOT switched yet (still emp-001)
    expect(container.querySelector('#emp-item-emp-001')?.className).toContain(
      'bg-accent',
    );

    // Resolve the in-flight save promises
    await act(async () => {
      resolvers.forEach((r) => r());
    });

    // After save resolves, lands on the latest clicked employee (emp-003), skipping intermediate emp-002!
    expect(container.querySelector('#emp-item-emp-003')?.className).toContain(
      'bg-accent',
    );
    expect(window.location.search).toBe('?employeeId=NV003');

    // Now test autosave failure on emp-003: edit Day 1, make API fail, try switching to emp-004 or next period
    mockOverrideSummary.mockReset();
    mockOverrideSummary.mockRejectedValueOnce(new Error('Network error 500'));

    const emp3Day1Cell = container
      .querySelectorAll('tbody tr')[0]
      ?.querySelectorAll('td')[2]
      ?.querySelector('[role="button"]') as HTMLElement;
    act(() => {
      fireEvent.doubleClick(emp3Day1Cell);
    });
    const emp3Day1Input = container
      .querySelectorAll('tbody tr')[0]
      ?.querySelectorAll('td')[2]
      ?.querySelector('input') as HTMLInputElement;
    act(() => {
      fireEvent.change(emp3Day1Input, { target: { value: '09:30' } });
      fireEvent.blur(emp3Day1Input);
    });

    const emp4Btn = container.querySelector(
      '#emp-item-emp-004',
    ) as HTMLButtonElement;
    await act(async () => {
      emp4Btn.click();
    });

    // Switch was blocked because save failed; user stays on emp-003 with dirty edit intact
    expect(showToast.error).toHaveBeenCalledWith('Network error 500');
    expect(container.querySelector('#emp-item-emp-003')?.className).toContain(
      'bg-accent',
    );
    expect(
      container.querySelectorAll('tbody tr')[0]?.querySelectorAll('td')[2]
        ?.textContent,
    ).toContain('09:30');

    // Now make save succeed and navigate period
    mockOverrideSummary.mockResolvedValue({ data: { ok: true } });
    const nextMonthBtn = container.querySelector(
      'button[aria-label="Tháng sau"]',
    ) as HTMLButtonElement;
    await act(async () => {
      nextMonthBtn.click();
    });

    expect(mockOverrideSummary).toHaveBeenCalledTimes(2);
    expect(mockNavigatePeriod).toHaveBeenCalledWith(1);
  });

  it('commits succeeded days on partial save failure so retry only sends failed days', async () => {
    const { employees, records, period } = buildDataset(5, '2026-10');

    const { container } = render(
      <DetailSheet
        period={period}
        employees={employees}
        records={records}
        canEdit={true}
        periodStatus="open"
      />,
    );

    const rows = container.querySelectorAll('tbody tr');
    // Edit Day 1 and Day 2 via multi-row paste
    const day1Cell = rows[0]
      ?.querySelectorAll('td')[2]
      ?.querySelector('[role="button"]') as HTMLElement;
    act(() => {
      fireEvent.click(day1Cell);
    });
    act(() => {
      const pasteEvent = new Event('paste', {
        bubbles: true,
        cancelable: true,
      }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: () => '08:10\n08:20',
        },
      });
      window.dispatchEvent(pasteEvent);
    });

    // First save attempt: 2026-10-01 succeeds, 2026-10-02 fails
    mockOverrideSummary.mockImplementation(
      (payload: { workDate: string }) => {
        if (payload.workDate === '2026-10-02') {
          return Promise.reject(new Error('Day 2 failed'));
        }
        return Promise.resolve({ data: { ok: true } });
      },
    );

    await act(async () => {
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    });

    expect(mockOverrideSummary).toHaveBeenCalledTimes(2);
    // Day 1 is no longer dirty; only Day 2 remains dirty
    expect(rows[0]?.querySelectorAll('td')[2]?.className).not.toContain(
      'excel-cell-dirty',
    );
    expect(rows[1]?.querySelectorAll('td')[2]?.className).toContain(
      'excel-cell-dirty',
    );

    // Retry save: only Day 2 ('2026-10-02') is sent!
    mockOverrideSummary.mockReset();
    mockOverrideSummary.mockResolvedValue({ data: { ok: true } });

    await act(async () => {
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    });

    expect(mockOverrideSummary).toHaveBeenCalledTimes(1);
    expect(mockOverrideSummary.mock.calls[0]?.[0]?.workDate).toBe('2026-10-02');
    expect(rows[1]?.querySelectorAll('td')[2]?.className).not.toContain(
      'excel-cell-dirty',
    );
  });

  it('preserves unsaved staged edits when server records refetch in background, and supports discard to last saved state', async () => {
    const { employees, records, period } = buildDataset(5, '2026-10');

    const { container, rerender } = render(
      <DetailSheet
        period={period}
        employees={employees}
        records={records}
        canEdit={true}
        periodStatus="open"
      />,
    );

    const rows = container.querySelectorAll('tbody tr');
    const day1Cell = rows[0]
      ?.querySelectorAll('td')[2]
      ?.querySelector('[role="button"]') as HTMLElement;
    act(() => {
      fireEvent.doubleClick(day1Cell);
    });
    const day1Input = rows[0]
      ?.querySelectorAll('td')[2]
      ?.querySelector('input') as HTMLInputElement;
    act(() => {
      fireEvent.change(day1Input, { target: { value: '08:45' } });
      fireEvent.blur(day1Input);
    });

    // Simulate background refetch of `records` for the SAME period while Day 1 is still dirty
    const refetchedRecords = records.map((r) => ({ ...r }));
    rerender(
      <DetailSheet
        period={period}
        employees={employees}
        records={refetchedRecords}
        canEdit={true}
        periodStatus="open"
      />,
    );

    // Unsaved edit '08:45' and dirty indicator must NOT be lost!
    expect(rows[0]?.querySelectorAll('td')[2]?.textContent).toContain('08:45');
    expect(rows[0]?.querySelectorAll('td')[2]?.className).toContain(
      'excel-cell-dirty',
    );

    // Save Day 1 ('08:45') via Ctrl+S
    await act(async () => {
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    });
    expect(mockOverrideSummary).toHaveBeenCalledTimes(1);
    expect(rows[0]?.querySelectorAll('td')[2]?.className).not.toContain(
      'excel-cell-dirty',
    );

    // Undo after save should do nothing (undo stack cleared on save)
    act(() => {
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    });
    expect(rows[0]?.querySelectorAll('td')[2]?.textContent).toContain('08:45');

    // Now edit Day 2 to '09:15', then click Discard ("Hủy"): Day 2 reverts to '08:00', while saved Day 1 stays '08:45'
    const day2Cell = rows[1]
      ?.querySelectorAll('td')[2]
      ?.querySelector('[role="button"]') as HTMLElement;
    act(() => {
      fireEvent.doubleClick(day2Cell);
    });
    const day2Input = rows[1]
      ?.querySelectorAll('td')[2]
      ?.querySelector('input') as HTMLInputElement;
    act(() => {
      fireEvent.change(day2Input, { target: { value: '09:15' } });
      fireEvent.blur(day2Input);
    });
    expect(rows[1]?.querySelectorAll('td')[2]?.textContent).toContain('09:15');

    const discardBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Hủy',
    ) as HTMLButtonElement;
    act(() => {
      discardBtn.click();
    });

    expect(rows[1]?.querySelectorAll('td')[2]?.textContent).toContain('08:00');
    expect(rows[0]?.querySelectorAll('td')[2]?.textContent).toContain('08:45');
  });

  it('isolates period query cache and aborts stale in-flight requests when switching periods rapidly (out-of-order API response guard)', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const signalsByPeriod: Record<string, AbortSignal | undefined> = {};
    let resolveSept!: (val: unknown) => void;
    let resolveAug!: (val: unknown) => void;

    mockGetWorkspace.mockImplementation(
      ({ period }: { period: string }, options?: { signal?: AbortSignal }) => {
        signalsByPeriod[period] = options?.signal;
        if (period === '2026-09') {
          return new Promise((resolve) => {
            resolveSept = resolve;
          });
        }
        return new Promise((resolve) => {
          resolveAug = resolve;
        });
      },
    );

    const { result, rerender } = renderHook(
      ({ p }: { p: string }) => useTimesheet(p),
      {
        wrapper,
        initialProps: { p: '2026-09' },
      },
    );

    expect(result.current.period).toBe('2026-09');
    expect(result.current.loading).toBe(true);

    // User switches to 2026-08 while 2026-09 is still in flight
    rerender({ p: '2026-08' });
    expect(result.current.period).toBe('2026-08');
    // 2026-09 AbortSignal should be aborted by React Query when its observer unsubscribes
    expect(signalsByPeriod['2026-09']?.aborted).toBe(true);

    // Now 2026-08 resolves FIRST, and 2026-09 resolves SECOND (out-of-order)
    await act(async () => {
      resolveAug({
        data: {
          employees: [
            {
              id: 'emp-aug',
              employeeCode: 'NV_AUG',
              fullName: 'August Employee',
              workingDays: 20,
              totalDays: 31,
            },
          ],
          records: [],
          periodStatus: 'locked',
          availableActions: [],
          totals: null,
        },
      });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.employees[0]?.id).toBe('emp-aug');

    await act(async () => {
      resolveSept({
        data: {
          employees: [
            {
              id: 'emp-sept',
              employeeCode: 'NV_SEPT',
              fullName: 'September Employee',
              workingDays: 22,
              totalDays: 30,
            },
          ],
          records: [],
          periodStatus: 'open',
          availableActions: [],
          totals: null,
        },
      });
    });

    // Late 2026-09 response must NEVER overwrite 2026-08 state!
    expect(result.current.period).toBe('2026-08');
    expect(result.current.employees[0]?.id).toBe('emp-aug');
    expect(result.current.periodStatus).toBe('locked');
  });

  it('enforces read-only formula columns, removes manual adjustment & clear-day actions, narrows note column to 110px, and maintains a single unified Excel selection box across select/edit/drag', () => {
    const { employees, records, period } = buildDataset(5, '2026-10');

    const { container } = render(
      <DetailSheet
        period={period}
        employees={employees}
        records={records}
        canEdit={true}
        periodStatus="open"
      />,
    );

    const rows = container.querySelectorAll('tbody tr');
    const day1Cells = rows[0]?.querySelectorAll('td') ?? [];
    expect(day1Cells.length).toBe(18);

    // 1. No manual adjustment edit icon in Date column
    expect(
      rows[0]?.querySelector('button[title*="giải trình"]'),
    ).toBeNull();

    // Select Day 1 checkInMorning (td[2])
    const checkInBtn = day1Cells[2]?.querySelector(
      '[role="button"]',
    ) as HTMLElement;
    act(() => {
      fireEvent.click(checkInBtn);
    });

    // 2. No "Xóa ngày" button in toolbar even when a day is active
    const clearDayBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Xóa ngày'),
    );
    expect(clearDayBtn).toBeUndefined();

    // 3. Formula columns (td[10]=Giờ, td[11]=Phút, td[12]=Công chính, td[13]=Tăng ca, td[14]=Thiếu công) are strictly read-only
    for (const colIdx of [10, 11, 12, 13, 14]) {
      const td = day1Cells[colIdx]!;
      expect(td.querySelector('[role="button"]')).toBeNull();
      act(() => {
        fireEvent.doubleClick(td);
      });
      expect(td.querySelector('input')).toBeNull();
    }

    // 4. Trực đêm (td[15]), Đứng nước (td[16]), Ghi chú (td[17]) remain editable
    for (const colIdx of [15, 16, 17]) {
      const td = day1Cells[colIdx]!;
      const cellBtn = td.querySelector('[role="button"]') as HTMLElement;
      expect(cellBtn).not.toBeNull();
      act(() => {
        fireEvent.doubleClick(cellBtn);
      });
      const input = td.querySelector('input') as HTMLInputElement;
      expect(input).not.toBeNull();
      act(() => {
        fireEvent.blur(input);
      });
    }

    // 5. Note column (td[17]) is narrowed to 110px
    expect(day1Cells[17]?.className).toContain('w-[110px]');

    // 6. Single Excel box across select, edit, and drag-to-fill
    act(() => {
      fireEvent.click(
        day1Cells[2]?.querySelector('[role="button"]') as HTMLElement,
      );
    });
    expect(day1Cells[2]?.className).toContain('excel-active-cell');
    expect(day1Cells[2]?.querySelector('.excel-fill-handle')).not.toBeNull();

    // Enter edit mode on td[2]: keeps excel-active-cell and .excel-fill-handle on the same cell
    act(() => {
      fireEvent.doubleClick(
        day1Cells[2]?.querySelector('[role="button"]') as HTMLElement,
      );
    });
    expect(day1Cells[2]?.className).toContain('excel-active-cell');
    expect(day1Cells[2]?.querySelector('input')).not.toBeNull();
    expect(day1Cells[2]?.querySelector('.excel-fill-handle')).not.toBeNull();

    act(() => {
      fireEvent.blur(day1Cells[2]?.querySelector('input') as HTMLInputElement);
    });

    // Drag fill handle from Day 1 (rows[0]) to Day 3 (rows[2]): forms 1 unified bounding rectangle
    const fillHandle = day1Cells[2]?.querySelector(
      '.excel-fill-handle',
    ) as HTMLElement;
    act(() => {
      fireEvent.mouseDown(fillHandle);
    });
    act(() => {
      fireEvent.mouseEnter(rows[2]!);
    });

    expect(rows[0]?.querySelectorAll('td')[2]?.className).toContain(
      'excel-fill-range-top',
    );
    expect(rows[1]?.querySelectorAll('td')[2]?.className).toContain(
      'excel-fill-range',
    );
    expect(rows[1]?.querySelectorAll('td')[2]?.className).not.toContain(
      'excel-fill-range-top',
    );
    expect(rows[1]?.querySelectorAll('td')[2]?.className).not.toContain(
      'excel-fill-range-bottom',
    );
    expect(rows[2]?.querySelectorAll('td')[2]?.className).toContain(
      'excel-fill-range-bottom',
    );

    act(() => {
      fireEvent.mouseUp(window);
    });

    // 7. Multi-cell row selection ("bôi đen cả 1 hàng dài") and dragging the whole row down like Excel
    act(() => {
      fireEvent.mouseDown(day1Cells[2]!);
      fireEvent.mouseEnter(day1Cells[5]!);
      fireEvent.mouseUp(window);
    });

    // Cells 2..5 on Day 1 form a unified horizontal range rectangle with fill handle on the rightmost cell (td[5])
    expect(day1Cells[2]?.className).toContain('excel-range-left');
    expect(day1Cells[5]?.className).toContain('excel-range-right');
    expect(day1Cells[5]?.querySelector('.excel-fill-handle')).not.toBeNull();

    // Drag the row selection fill handle from Day 1 down to Day 3
    const rowFillHandle = day1Cells[5]?.querySelector(
      '.excel-fill-handle',
    ) as HTMLElement;
    act(() => {
      fireEvent.mouseDown(rowFillHandle);
    });
    act(() => {
      fireEvent.mouseEnter(rows[2]!);
    });

    // All 4 selected columns (td[2]..td[5]) across Days 1..3 are in the fill range
    expect(rows[0]?.querySelectorAll('td')[2]?.className).toContain(
      'excel-fill-range-left',
    );
    expect(rows[2]?.querySelectorAll('td')[5]?.className).toContain(
      'excel-fill-range-right',
    );

    act(() => {
      fireEvent.mouseUp(window);
    });

    // 8. AUD-04: Dragging from inside an already-selected cell starts a new range selection (NOT fill-drag)
    act(() => {
      fireEvent.mouseDown(day1Cells[3]!); // Click inside the already-highlighted block (td[3])
    });
    act(() => {
      fireEvent.mouseEnter(rows[4]?.querySelectorAll('td')[4]!); // Drag down to Day 5 col 4
    });

    expect(rows[0]?.querySelectorAll('td')[3]?.className).toContain(
      'excel-range-cell',
    );
    expect(rows[4]?.querySelectorAll('td')[4]?.className).toContain(
      'excel-range-cell',
    );
    expect(rows[4]?.querySelectorAll('td')[4]?.className).not.toContain(
      'excel-fill-range',
    );

    act(() => {
      fireEvent.mouseUp(window);
    });

    // 9. Typing letters into a time cell displays the "Chỉ chấp nhận giờ/số" tooltip and blocks invalid chars
    const day6MorningInTd = rows[5]?.querySelectorAll('td')[2] as HTMLElement;
    const day6MorningInBtn = day6MorningInTd.querySelector(
      '[role="button"]',
    ) as HTMLElement;
    act(() => {
      fireEvent.mouseDown(day6MorningInTd);
      fireEvent.mouseUp(window);
      fireEvent.click(day6MorningInBtn);
    });
    act(() => {
      fireEvent.keyDown(day6MorningInBtn, { key: 'a' });
    });
    expect(
      container.querySelector('[data-testid="cell-invalid-tooltip"]')
        ?.textContent,
    ).toBe('Chỉ chấp nhận giờ/số');

    // Typing a valid digit hides the tooltip and starts editing with that digit
    act(() => {
      fireEvent.keyDown(day6MorningInBtn, { key: '8' });
    });
    expect(
      container.querySelector('[data-testid="cell-invalid-tooltip"]'),
    ).toBeNull();
  });

  it('commits active input on Ctrl+S (AUD-03), rejects invalid time on commit (AUD-02), and preserves row 1 on Note multi-row paste (AUD-06)', async () => {
    const { employees, records, period } = buildDataset(3, '2026-10');

    const { container } = render(
      <DetailSheet
        period={period}
        employees={employees}
        records={records}
        canEdit={true}
        periodStatus="open"
      />,
    );

    const rows = container.querySelectorAll('tbody tr');

    // 1. AUD-02: Entering "25:00" into checkInMorning and pressing Enter reverts to "08:00" and shows error tooltip
    const day1TimeBtn = rows[0]
      ?.querySelectorAll('td')[2]
      ?.querySelector('[role="button"]') as HTMLElement;
    act(() => {
      fireEvent.doubleClick(day1TimeBtn);
    });
    const day1TimeInput = rows[0]
      ?.querySelectorAll('td')[2]
      ?.querySelector('input') as HTMLInputElement;
    act(() => {
      fireEvent.change(day1TimeInput, { target: { value: '25:00' } });
      fireEvent.keyDown(day1TimeInput, { key: 'Enter' });
    });

    expect(day1TimeInput.value).toBe('08:00');
    expect(rows[0]?.querySelectorAll('td')[2]?.className).not.toContain(
      'excel-cell-dirty',
    );
    expect(
      container.querySelector('[data-testid="cell-invalid-tooltip"]')
        ?.textContent,
    ).toBe('Giờ không hợp lệ (00:00 - 23:59)');
    act(() => {
      fireEvent.blur(day1TimeInput);
    });
    expect(rows[0]?.querySelectorAll('td')[2]?.textContent).toContain('08:00');

    // 2. AUD-03: Pressing Ctrl+S while an input is still focused commits the value and saves it to the API
    const day2TimeBtn = rows[1]
      ?.querySelectorAll('td')[2]
      ?.querySelector('[role="button"]') as HTMLElement;
    act(() => {
      fireEvent.doubleClick(day2TimeBtn);
    });
    const day2TimeInput = rows[1]
      ?.querySelectorAll('td')[2]
      ?.querySelector('input') as HTMLInputElement;
    act(() => {
      day2TimeInput.focus();
      fireEvent.change(day2TimeInput, { target: { value: '07:45' } });
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    });

    expect(mockOverrideSummary).toHaveBeenCalledTimes(1);
    expect(mockOverrideSummary.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        employeeId: 'emp-001',
        workDate: '2026-10-02',
        checkInMorning: '07:45',
      }),
    );

    // 3. AUD-06: Pasting multi-line notes while EditableNoteCell input is open preserves row 1 and row 2
    const day3NoteBtn = rows[2]
      ?.querySelectorAll('td')[17]
      ?.querySelector('[role="button"]') as HTMLElement;
    act(() => {
      fireEvent.doubleClick(day3NoteBtn);
    });
    const day3NoteInput = rows[2]
      ?.querySelectorAll('td')[17]
      ?.querySelector('input') as HTMLInputElement;
    expect(day3NoteInput).toBeTruthy();

    act(() => {
      fireEvent.paste(day3NoteInput, {
        clipboardData: {
          getData: () => 'Ghi chú dòng 3\r\nGhi chú dòng 4',
        },
      });
    });

    expect(rows[2]?.querySelectorAll('td')[17]?.textContent).toContain(
      'Ghi chú dòng 3',
    );
    expect(rows[3]?.querySelectorAll('td')[17]?.textContent).toContain(
      'Ghi chú dòng 4',
    );
  });

  it('copies formula columns, blocks paste on formula columns, aligns multi-col paste across formula gap (AUD-07), navigates from formula cells (AUD-08), syncs Undo/Redo ref, warns on beforeunload (AUD-13), and renders Print All', async () => {
    const { employees, records, period } = buildDataset(3, '2026-10');
    const printSpy = jest
      .spyOn(window, 'print')
      .mockImplementation(() => undefined);

    const { container } = render(
      <DetailSheet
        period={period}
        employees={employees}
        records={records}
        canEdit={true}
        periodStatus="open"
      />,
    );

    const rows = container.querySelectorAll('tbody tr');
    const day1Cells = rows[0]?.querySelectorAll('td') ?? [];

    // 1. Select formula column td[12] (Công chính, visual col 10)
    act(() => {
      fireEvent.mouseDown(day1Cells[12]!);
      fireEvent.mouseUp(window);
    });
    expect(day1Cells[12]?.className).toContain('excel-active-cell');
    expect(day1Cells[12]?.querySelector('.excel-fill-handle')).toBeNull();

    // Copy formula column value
    let copiedText = '';
    act(() => {
      const copyEvent = new Event('copy', {
        bubbles: true,
        cancelable: true,
      }) as unknown as ClipboardEvent;
      Object.defineProperty(copyEvent, 'clipboardData', {
        value: {
          setData: (_type: string, val: string) => {
            copiedText = val;
          },
        },
      });
      window.dispatchEvent(copyEvent);
    });
    expect(copiedText).toBe('0.5');

    // Attempt paste on formula column td[12] -> blocked with warning toast, does NOT mutate nightShift (td[15])
    act(() => {
      const pasteEvent = new Event('paste', {
        bubbles: true,
        cancelable: true,
      }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: () => '5',
        },
      });
      window.dispatchEvent(pasteEvent);
    });
    expect(showToast.warning).toHaveBeenCalledWith(
      'Cột công thức chỉ đọc, không thể dán dữ liệu',
    );
    expect(day1Cells[15]?.textContent).not.toContain('5');

    // 2. AUD-08: Keyboard navigation from formula column td[14] (visual col 12) right to td[15] (visual col 13, nightShift)
    act(() => {
      fireEvent.mouseDown(day1Cells[14]!);
      fireEvent.mouseUp(window);
    });
    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    });
    expect(day1Cells[15]?.className).toContain('excel-active-cell');

    // 3. AUD-07: Multi-column paste starting at duty30kHours (td[9], visual col 7) across 7 columns (visual cols 7..13)
    // Col 7 = 1.5 (90m), Cols 8..12 = formula (ignored), Col 13 = 2 (nightShift)
    act(() => {
      fireEvent.click(
        day1Cells[9]?.querySelector('[role="button"]') as HTMLElement,
      );
    });
    act(() => {
      const pasteEvent = new Event('paste', {
        bubbles: true,
        cancelable: true,
      }) as unknown as ClipboardEvent;
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: () => '1.5\t8\t0\t1\t0\t0\t2',
        },
      });
      window.dispatchEvent(pasteEvent);
    });
    expect(day1Cells[9]?.textContent).toContain('1.5');
    expect(day1Cells[15]?.textContent).toContain('2');

    // 4. AUD-13: beforeunload prevents default when dirtyDayCount > 0
    const unloadEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unloadEvent);
    expect(unloadEvent.defaultPrevented).toBe(true);

    // 5. Undo -> Redo -> Ctrl+S sends redone values (latestRef.current.recordByDate is synced)
    act(() => {
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    });
    expect(day1Cells[15]?.textContent).not.toContain('2');
    act(() => {
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    });
    expect(day1Cells[15]?.textContent).toContain('2');

    await act(async () => {
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    });
    expect(mockOverrideSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'emp-001',
        workDate: '2026-10-01',
        duty30kMinutes: 90,
        nightShiftDutyCount: 2,
      }),
    );

    // 6. Print All renders multi-employee print sheets
    const printMenuBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('In / PDF'),
    ) as HTMLButtonElement;
    expect(printMenuBtn).toBeTruthy();
    act(() => {
      fireEvent.keyDown(printMenuBtn, { key: 'Enter' });
    });
    const printAllItem = Array.from(
      document.body.querySelectorAll('[role="menuitem"]'),
    ).find((el) => el.textContent?.includes('In toàn bộ kỳ công')) as HTMLElement;
    expect(printAllItem).toBeTruthy();
    act(() => {
      fireEvent.click(printAllItem);
    });
    expect(
      container.querySelectorAll('[data-testid="print-employee-sheet"]'),
    ).toHaveLength(3);

    printSpy.mockRestore();
  });
});
