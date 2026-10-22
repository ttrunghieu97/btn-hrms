'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { timekeepingControllerGetTimesheetWorkspace } from '@/api/generated/attendance-timekeeping/attendance-timekeeping';
import { unwrapData } from '@/lib/api-extract';
import {
  getTimesheetWorkspaceQueryKey,
  useTimesheet,
} from './hooks/use-timesheet';
import { usePeriodLock } from './hooks/use-period-lock';
import { DetailSheet } from './components/detail-sheet';
import type { TimesheetWorkspaceResponse } from './types';
import { attendanceUiCopy } from '@/lib/app-copy';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/stores/auth-store';
import { attendance, hasPermission } from '@/lib/permissions';

// ─── Period navigation helper ──────────────────────────────────────────

function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y!, m! - 1, 1);
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Close Period Confirmation Dialog ──────────────────────────────────

function CloseModal({
  period,
  missingCount,
  onClose,
  onConfirm,
}: {
  period: string;
  missingCount: number;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
}) {
  const [r, setR] = React.useState('');
  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Đóng / Chốt bảng công tháng {period}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {missingCount > 0 ? (
              <span className="text-amber-700 dark:text-amber-400">
                Hiện còn{' '}
                <strong className="underline">{missingCount} nhân sự</strong>{' '}
                chưa chốt công cá nhân. Việc đóng kỳ sẽ lưu snapshot hiện tại
                cho phân hệ Payroll.
              </span>
            ) : (
              'Tất cả nhân sự trong kỳ đã được chốt công. Hệ thống sẽ đóng kỳ và chuyển dữ liệu sang phân hệ Payroll.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={r}
          onChange={(e) => setR(e.target.value)}
          placeholder="Ghi chú đóng kỳ công (Không bắt buộc)"
        />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(r)}>
            Xác nhận Đóng kỳ công
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReopenModal({
  period,
  onClose,
  onConfirm,
}: {
  period: string;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
}) {
  const [r, setR] = React.useState('');
  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mở lại kỳ công tháng {period}</AlertDialogTitle>
          <AlertDialogDescription>
            Hệ thống sẽ chuyển trạng thái kỳ công về Đang mở để cho phép HR
            chỉnh sửa, điều chỉnh dữ liệu chấm công. Thao tác này sẽ được ghi
            nhận vào nhật ký kiểm toán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={r}
          onChange={(e) => setR(e.target.value)}
          placeholder="Lý do mở lại kỳ công (Không bắt buộc)"
        />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(r)}>
            Xác nhận Mở lại kỳ công
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TimesheetWorkspaceSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="flex min-h-0 flex-1 gap-3">
        <Skeleton className="hidden h-[560px] w-[285px] shrink-0 rounded-xl md:block" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-[420px] w-full flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Monthly Attendance Page ──────────────────────────────────────

export function TimesheetEditorPage({
  defaultPeriod,
}: {
  defaultPeriod?: string;
}) {
  const queryClient = useQueryClient();
  const params = useParams();
  const searchParams = useSearchParams();
  const routePeriod =
    typeof params?.period === 'string' ? params.period : undefined;
  const activePeriod = routePeriod ?? defaultPeriod;

  const ts = useTimesheet(activePeriod);
  const pl = usePeriodLock();

  // Prefetch adjacent months (-1 and +1) after current period paint so month switching is instant
  React.useEffect(() => {
    if (ts.loading) return;
    const timer = setTimeout(() => {
      for (const delta of [-1, 1]) {
        const adjPeriod = shiftPeriod(ts.period, delta);
        void queryClient.prefetchQuery({
          queryKey: getTimesheetWorkspaceQueryKey(adjPeriod),
          queryFn: async ({ signal }) => {
            const res = await timekeepingControllerGetTimesheetWorkspace(
              { period: adjPeriod },
              { signal },
            );
            return unwrapData<TimesheetWorkspaceResponse>(res);
          },
          staleTime: 30_000,
        });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [queryClient, ts.loading, ts.period]);

  // Restore period state on browser Back / Forward navigation
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const match = window.location.pathname.match(
        /\/attendance\/management\/periods\/(\d{4}-\d{2})/,
      );
      const popPeriod = match?.[1] ?? activePeriod;
      if (popPeriod) {
        ts.setPeriod(popPeriod);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activePeriod, ts]);

  const navigatePeriod = React.useCallback(
    (delta: number) => {
      const nextPeriod = shiftPeriod(ts.period, delta);
      ts.setPeriod(nextPeriod);
      if (typeof window !== 'undefined') {
        const currentSearch = window.location.search
          ? window.location.search
          : searchParams.toString()
            ? `?${searchParams.toString()}`
            : '';
        const nextUrl = `/attendance/management/periods/${nextPeriod}${currentSearch}`;
        const currentUrl = `${window.location.pathname}${window.location.search}`;
        if (currentUrl !== nextUrl) {
          window.history.pushState(window.history.state, '', nextUrl);
        }
      }
    },
    [searchParams, ts],
  );

  const [showClose, setShowClose] = React.useState(false);
  const [showReopen, setShowReopen] = React.useState(false);

  const user = useAuthStore((s) => s.user);
  const canEdit = ts.periodStatus === 'open' || ts.periodStatus === 'in_review';
  const hasLockPerm =
    ts.availableActions.includes('lock') ||
    hasPermission(user?.permissions, attendance.periodLock);
  const hasApprovePerm =
    ts.periodStatus === 'in_review' &&
    (ts.availableActions.includes('approve') ||
      hasPermission(user?.permissions, attendance.periodApprove));
  const canLockPeriod = hasLockPerm || hasApprovePerm;

  const hasUnlockPerm =
    ts.periodStatus === 'locked' &&
    (ts.availableActions.includes('unlock') ||
      hasPermission(user?.permissions, attendance.periodUnlock));
  const hasReopenPerm =
    (ts.periodStatus === 'locked' || ts.periodStatus === 'closed') &&
    (ts.availableActions.includes('reopen') ||
      hasPermission(user?.permissions, attendance.periodClose));
  const canUnlockOrReopenPeriod = hasUnlockPerm || hasReopenPerm;

  const canTogglePeriodStatus = canEdit
    ? canLockPeriod
    : canUnlockOrReopenPeriod;

  // Count of employees not yet individually verified (chưa chốt cá nhân)
  const missingCount = React.useMemo(
    () => ts.employees.filter((e) => e.verificationStatus !== 'done').length,
    [ts.employees],
  );

  const handleLock = React.useCallback(
    async (remarks: string) => {
      const cleanRemarks = remarks.trim();
      const ok =
        ts.periodStatus === 'in_review' && !hasLockPerm && hasApprovePerm
          ? await pl.approve(ts.period)
          : await pl.lock(ts.period, cleanRemarks || undefined);
      if (ok) await ts.reload();
      setShowClose(false);
    },
    [hasApprovePerm, hasLockPerm, pl, ts],
  );

  const handleReopen = React.useCallback(
    async (remarks: string) => {
      const cleanRemarks = remarks.trim();
      const remarkText =
        cleanRemarks ||
        (hasUnlockPerm ? 'HR mở khóa kỳ công' : 'HR mở lại kỳ công');
      const ok = hasUnlockPerm
        ? await pl.unlock(ts.period, remarkText)
        : await pl.reopen(ts.period, remarkText);
      if (ok) await ts.reload();
      setShowReopen(false);
    },
    [hasUnlockPerm, pl, ts],
  );

  if (ts.loading) {
    return <TimesheetWorkspaceSkeleton />;
  }

  if (ts.errorObject || ts.error) {
    return (
      <QueryErrorAlert
        error={ts.errorObject ?? new Error(ts.error ?? 'Unknown error')}
        subject={attendanceUiCopy.subject}
        onRetry={() => void ts.reload()}
        className="rounded-xl border-destructive/50 bg-destructive/5"
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* ── Split workspace ── */}
      <div className="flex min-h-0 flex-1 flex-col">
        <DetailSheet
          period={ts.period}
          employees={ts.employees}
          records={ts.records}
          canEdit={canEdit}
          canTogglePeriodStatus={canTogglePeriodStatus}
          onReload={ts.reload}
          navigatePeriod={navigatePeriod}
          onClosePeriod={() => setShowClose(true)}
          onReopenPeriod={() => setShowReopen(true)}
          periodStatus={ts.periodStatus}
        />
      </div>

      {/* ── Dialogs ── */}
      {showClose && (
        <CloseModal
          period={ts.period}
          missingCount={missingCount}
          onClose={() => setShowClose(false)}
          onConfirm={handleLock}
        />
      )}
      {showReopen && (
        <ReopenModal
          period={ts.period}
          onClose={() => setShowReopen(false)}
          onConfirm={handleReopen}
        />
      )}
    </div>
  );
}
