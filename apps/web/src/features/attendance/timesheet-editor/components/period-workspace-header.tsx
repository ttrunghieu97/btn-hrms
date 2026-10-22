'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import type { PeriodStatus } from '../types';

interface PeriodWorkspaceHeaderProps {
  period: string;
  periodStatus?: PeriodStatus | string | null;
  totalEmployees: number;
  verifiedCount: number;
  onNavigatePeriod: (delta: number) => void;
  canTogglePeriodStatus?: boolean;
  isPeriodOpen: boolean;
  onTogglePeriodStatus: () => void;
}

function formatPeriodDisplay(period: string): string {
  const [year, month] = period.split('-');
  if (!year || !month) return period;
  return `Tháng ${month}/${year}`;
}

function PeriodStatusBadge({
  status,
}: {
  status?: PeriodStatus | string | null;
}) {
  switch (status) {
    case 'open':
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-xs font-medium text-emerald-700 dark:text-emerald-400"
        >
          <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500" />
          Đang mở kỳ công
        </Badge>
      );
    case 'in_review':
      return (
        <Badge
          variant="secondary"
          className="bg-amber-500/10 text-xs font-medium text-amber-700 dark:text-amber-400"
        >
          Đang xét duyệt
        </Badge>
      );
    case 'locked':
    case 'payroll_processing':
    case 'payroll_posted':
      return (
        <Badge
          variant="default"
          className="bg-emerald-600 text-xs font-medium text-white"
        >
          <Icons.lock className="mr-1 size-3" />
          Đã khóa bảng công
        </Badge>
      );
    case 'closed':
      return (
        <Badge
          variant="outline"
          className="border-blue-500/40 bg-blue-500/10 text-xs font-medium text-blue-700 dark:text-blue-300"
        >
          Đã chốt kỳ
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="bg-muted/40 text-muted-foreground text-xs"
        >
          Bản nháp
        </Badge>
      );
  }
}

export const PeriodWorkspaceHeader = React.memo(function PeriodWorkspaceHeader({
  period,
  periodStatus,
  totalEmployees,
  verifiedCount,
  onNavigatePeriod,
  canTogglePeriodStatus,
  isPeriodOpen,
  onTogglePeriodStatus,
}: PeriodWorkspaceHeaderProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 print:hidden">
      {/* Left: Period Selector + Lifecycle Status */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Tháng trước"
            onClick={() => onNavigatePeriod(-1)}
            className="size-8"
          >
            <Icons.chevronLeft className="size-4" />
          </Button>
          <span className="text-foreground min-w-[110px] text-center text-sm font-medium tabular-nums">
            {formatPeriodDisplay(period)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Tháng sau"
            onClick={() => onNavigatePeriod(1)}
            className="size-8"
          >
            <Icons.chevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PeriodStatusBadge status={periodStatus} />
          <Badge variant="secondary" className="text-xs font-medium tabular-nums">
            Đã chốt: {verifiedCount}/{totalEmployees} nhân sự
          </Badge>
        </div>
      </div>

      {/* Right: Lock/Unlock Period */}
      {canTogglePeriodStatus && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={isPeriodOpen ? 'default' : 'outline'}
            size="sm"
            onClick={onTogglePeriodStatus}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            {isPeriodOpen ? (
              <>
                <Icons.lock className="size-3.5" />
                <span>Khóa kỳ công</span>
              </>
            ) : (
              <>
                <Icons.restore className="size-3.5" />
                <span>Mở lại kỳ</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
});
