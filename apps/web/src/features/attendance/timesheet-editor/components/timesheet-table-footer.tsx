'use client';

import * as React from 'react';
import { TableCell, TableFooter, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { MonthStats } from '../kpi-summary';

export interface TimesheetTableFooterProps {
  stats: MonthStats;
}

export const TimesheetTableFooter = React.memo(function TimesheetTableFooter({
  stats: s,
}: TimesheetTableFooterProps) {
  const totWorkedMinutes = Math.round(
    s.totWorkedMinutes ?? Math.round(s.totHours * 60),
  );
  const totalHoursInt = Math.floor(totWorkedMinutes / 60);
  const totalMinutesRemainder = totWorkedMinutes % 60;

  return (
    <TableFooter className="border-border bg-muted sticky bottom-0 z-20 border-t">
      <TableRow className="bg-muted font-semibold hover:bg-transparent">
        <TableCell className="bg-card border-border/50 sticky bottom-0 left-0 z-30 w-[44px] min-w-[44px] max-w-[44px] border-r px-1 text-center text-xs">
          Tổng
        </TableCell>
        <TableCell className="bg-card border-border/50 sticky bottom-0 left-[44px] z-30 w-[44px] min-w-[44px] max-w-[44px] border-r px-1 text-center text-xs">
          cộng
        </TableCell>

        {/* 4 AM/PM cols */}
        <TableCell className="border-border/50 text-muted-foreground/40 w-[54px] min-w-[54px] border-r px-1 text-center text-xs">
          —
        </TableCell>
        <TableCell className="border-border/50 text-muted-foreground/40 w-[54px] min-w-[54px] border-r px-1 text-center text-xs">
          —
        </TableCell>
        <TableCell className="border-border/50 text-muted-foreground/40 w-[54px] min-w-[54px] border-r px-1 text-center text-xs">
          —
        </TableCell>
        <TableCell className="border-border/50 text-muted-foreground/40 w-[54px] min-w-[54px] border-r px-1 text-center text-xs">
          —
        </TableCell>

        {/* 4 Break/Duty cols */}
        <TableCell className="border-border/50 text-foreground w-[64px] min-w-[64px] border-r px-1 text-center text-xs font-semibold tabular-nums">
          {s.breakHours > 0 ? s.breakHours.toFixed(1) : '—'}
        </TableCell>
        <TableCell className="border-border/50 text-foreground w-[64px] min-w-[64px] border-r px-1 text-center text-xs font-semibold tabular-nums">
          {s.personalBreakHours > 0 ? s.personalBreakHours.toFixed(1) : '—'}
        </TableCell>
        <TableCell className="border-border/50 text-foreground w-[64px] min-w-[64px] border-r px-1 text-center text-xs font-semibold tabular-nums">
          {s.lunchDutyHours > 0 ? s.lunchDutyHours.toFixed(1) : '—'}
        </TableCell>
        <TableCell className="border-border/50 text-foreground w-[64px] min-w-[64px] border-r px-1 text-center text-xs font-semibold tabular-nums">
          {s.duty35kHours > 0 ? s.duty35kHours.toFixed(1) : '—'}
        </TableCell>

        {/* 2 Total Hours cols: Giờ / Phút */}
        <TableCell className="border-border/50 text-foreground w-[44px] min-w-[44px] border-r px-1 text-center text-xs font-semibold tabular-nums">
          {totalHoursInt}
        </TableCell>
        <TableCell className="border-border/50 text-foreground w-[44px] min-w-[44px] border-r px-1 text-center text-xs font-semibold tabular-nums">
          {String(totalMinutesRemainder).padStart(2, '0')}
        </TableCell>

        {/* Công chính */}
        <TableCell className="border-border/50 w-[72px] min-w-[72px] border-r bg-emerald-500/10 px-1 text-center text-xs font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
          {s.mainWork.toFixed(1)}
        </TableCell>

        {/* Tăng ca */}
        <TableCell className="border-border/50 w-[60px] min-w-[60px] border-r bg-sky-500/10 px-1 text-center text-xs font-semibold text-sky-600 tabular-nums dark:text-sky-400">
          {s.otHours > 0 ? s.otHours.toFixed(1) : '—'}
        </TableCell>

        {/* Thiếu công */}
        <TableCell
          className={cn(
            'border-border/50 w-[68px] min-w-[68px] border-r px-1 text-center text-xs font-semibold tabular-nums',
            s.deficitHours > 0
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'text-muted-foreground/40',
          )}
        >
          {s.deficitHours > 0 ? s.deficitHours.toFixed(1) : '—'}
        </TableCell>

        {/* Trực đêm */}
        <TableCell className="border-border/50 text-foreground w-[62px] min-w-[62px] border-r px-1 text-center text-xs font-semibold tabular-nums">
          {s.night > 0 ? s.night : '—'}
        </TableCell>

        {/* Đứng nước */}
        <TableCell className="border-border/50 text-foreground w-[66px] min-w-[66px] border-r px-1 text-center text-xs font-semibold tabular-nums">
          {s.water > 0 ? s.water : '—'}
        </TableCell>

        {/* Ghi chú */}
        <TableCell className="border-border/50 text-muted-foreground w-[110px] min-w-[110px] px-2 text-xs font-normal tabular-nums">
          {s.presentDays}/{s.totalDays} ngày đi làm
        </TableCell>
      </TableRow>
    </TableFooter>
  );
});
