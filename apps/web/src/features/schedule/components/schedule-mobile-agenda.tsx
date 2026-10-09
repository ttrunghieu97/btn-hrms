'use client';

import * as React from 'react';
import { format, addDays, isSameDay, isToday } from 'date-fns';
import type { ScheduleRow } from '@/features/schedule/api/queries';
import { AgendaGroup, AgendaItem } from '@/components/ui/agenda';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { AppEmptyState } from '@/components/ui/app-empty-state';

interface ScheduleMobileAgendaProps {
  rows: ScheduleRow[];
  weekStart: Date;
  onSelectRow: (row: ScheduleRow) => void;
  selectedRow: ScheduleRow | null;
  onNavigateWeek: (delta: number) => void;
  onCurrentWeek: () => void;
  hasFilters: boolean;
  onClearFilters?: () => void;
  onAssignNew?: () => void;
}

const VN_DAYS_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VN_DAYS_FULL = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

function getInitials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatMinutes(m: number) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h}h${r}p` : `${h}h`;
}

export function ScheduleMobileAgenda({
  rows,
  weekStart,
  onSelectRow,
  selectedRow,
  onNavigateWeek,
  onCurrentWeek,
  hasFilters,
  onClearFilters,
  onAssignNew,
}: ScheduleMobileAgendaProps) {
  const [selectedDayFilter, setSelectedDayFilter] = React.useState<string | null>(null);

  // Generate 7 days in the active week
  const weekDays = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      const iso = format(d, 'yyyy-MM-dd');
      const dayOfWeekIdx = d.getDay(); // 0 is Sunday
      return {
        date: d,
        iso,
        shortDay: VN_DAYS_SHORT[dayOfWeekIdx],
        fullDay: VN_DAYS_FULL[dayOfWeekIdx],
        dayNum: format(d, 'dd/MM'),
        isCurrentDay: isToday(d),
      };
    });
  }, [weekStart]);

  // Group rows by workDate
  const groupedByDate = React.useMemo(() => {
    const map = new Map<string, ScheduleRow[]>();
    for (const d of weekDays) {
      map.set(d.iso, []);
    }
    for (const r of rows) {
      const list = map.get(r.workDate);
      if (list) {
        list.push(r);
      } else {
        map.set(r.workDate, [r]);
      }
    }
    return map;
  }, [rows, weekDays]);

  // Filtered days to display
  const daysToRender = React.useMemo(() => {
    if (!selectedDayFilter) return weekDays;
    return weekDays.filter((d) => d.iso === selectedDayFilter);
  }, [weekDays, selectedDayFilter]);

  return (
    <div className='flex flex-col gap-3.5 w-full'>
      {/* ── Mobile One-Handed Date Navigation ── */}
      <div className='flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-2.5 shadow-2xs'>
        <div className='flex items-center justify-between gap-1'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            aria-label='Tuần trước'
            className='h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg shrink-0'
            onClick={() => onNavigateWeek(-7)}
          >
            <Icons.chevronLeft className='size-5' />
          </Button>

          <div className='flex flex-col items-center justify-center flex-1 min-w-0 px-2'>
            <span className='font-semibold text-xs sm:text-sm text-foreground truncate'>
              {format(weekStart, 'dd/MM/yyyy')} — {format(addDays(weekStart, 6), 'dd/MM/yyyy')}
            </span>
            <button
              type='button'
              onClick={onCurrentWeek}
              className='text-[11px] font-medium text-primary hover:underline underline-offset-2 mt-0.5'
            >
              Về tuần hiện tại
            </button>
          </div>

          <Button
            type='button'
            variant='outline'
            size='icon'
            aria-label='Tuần sau'
            className='h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg shrink-0'
            onClick={() => onNavigateWeek(7)}
          >
            <Icons.chevronRight className='size-5' />
          </Button>
        </div>

        {/* ── Quick Day Filter Carousel (Pills) ── */}
        <div
          role='tablist'
          aria-label='Chọn nhanh ngày trong tuần'
          className='flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar -mx-1 px-1'
        >
          <button
            type='button'
            role='tab'
            aria-selected={selectedDayFilter === null}
            onClick={() => setSelectedDayFilter(null)}
            className={cn(
              'inline-flex min-h-[44px] items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium shrink-0 transition-colors border',
              selectedDayFilter === null
                ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                : 'bg-background text-muted-foreground border-border/70 hover:bg-muted/50 hover:text-foreground'
            )}
          >
            Cả tuần ({rows.length})
          </button>

          {weekDays.map((d) => {
            const count = groupedByDate.get(d.iso)?.length ?? 0;
            const isSelected = selectedDayFilter === d.iso;

            return (
              <button
                key={d.iso}
                type='button'
                role='tab'
                aria-selected={isSelected}
                aria-label={`${d.fullDay}, ngày ${d.dayNum}, có ${count} ca`}
                onClick={() => setSelectedDayFilter(isSelected ? null : d.iso)}
                className={cn(
                  'inline-flex min-h-[44px] flex-col items-center justify-center rounded-lg px-2.5 py-1 text-xs shrink-0 transition-colors border',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-2xs font-semibold'
                    : d.isCurrentDay
                    ? 'bg-primary/10 text-primary border-primary/40 font-medium'
                    : 'bg-background text-muted-foreground border-border/70 hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <div className='flex items-center gap-1 text-[11px] leading-tight'>
                  <span>{d.shortDay}</span>
                  {d.isCurrentDay && <span className='size-1.5 rounded-full bg-primary inline-block' />}
                </div>
                <div className='text-[10px] opacity-80 leading-tight'>
                  {d.dayNum} ({count})
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Quick Actions Bar for Mobile ── */}
      {onAssignNew && (
        <div className='flex items-center justify-between gap-2'>
          <span className='text-xs text-muted-foreground'>
            {rows.length} ca làm việc được tìm thấy
          </span>
          <Button
            type='button'
            size='sm'
            onClick={onAssignNew}
            className='min-h-[44px] sm:min-h-[36px] text-xs'
          >
            <Icons.add className='mr-1.5 size-4' />
            Gán ca mới
          </Button>
        </div>
      )}

      {/* ── Empty State ── */}
      {rows.length === 0 ? (
        <AppEmptyState
          icon={<Icons.calendar className='size-10' />}
          title={hasFilters ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có lịch làm việc trong tuần này'}
          description={
            hasFilters
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc trạng thái.'
              : 'Hãy gán ca mới cho nhân viên để bắt đầu xếp lịch.'
          }
          action={
            hasFilters && onClearFilters ? (
              <Button
                type='button'
                variant='outline'
                onClick={onClearFilters}
                className='min-h-[44px]'
              >
                Xóa bộ lọc
              </Button>
            ) : undefined
          }
          className='my-4 p-6'
        />
      ) : (
        /* ── Agenda Groups & Items ── */
        <div className='flex flex-col gap-5'>
          {daysToRender.map((d) => {
            const dayRows = groupedByDate.get(d.iso) ?? [];

            return (
              <AgendaGroup
                key={d.iso}
                title={`${d.fullDay}, ${d.dayNum}`}
                isToday={d.isCurrentDay}
                count={dayRows.length}
              >
                {dayRows.length === 0 ? (
                  <div className='flex min-h-[56px] items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground'>
                    Không có ca làm việc nào trong ngày này
                  </div>
                ) : (
                  dayRows.map((row) => {
                    const isSelected =
                      selectedRow?.assignmentId === row.assignmentId &&
                      selectedRow?.workDate === row.workDate;

                    return (
                      <AgendaItem
                        key={`${row.assignmentId}-${row.workDate}`}
                        title={row.employeeName || row.employeeId}
                        subTitle={`${row.shiftTemplateName || row.shiftTemplateCode || 'Ca làm việc'} · ${row.employeeId}`}
                        timeRange={`${row.startTime} — ${row.endTime}${row.overnight ? ' (+1)' : ''}`}
                        avatar={
                          <Avatar className='size-9'>
                            <AvatarFallback className='text-xs bg-primary/10 text-primary font-medium'>
                              {getInitials(row.employeeName || row.employeeId)}
                            </AvatarFallback>
                          </Avatar>
                        }
                        badge={
                          <Badge
                            variant={row.assignmentStatus === 'published' ? 'default' : 'secondary'}
                            className='text-xs'
                          >
                            {row.assignmentStatus === 'published' ? 'Đã công bố' : 'Đã lên kế hoạch'}
                          </Badge>
                        }
                        details={
                          <span className='font-medium text-foreground'>
                            {formatMinutes(row.scheduledMinutes)}
                          </span>
                        }
                        onClick={() => onSelectRow(row)}
                        selected={isSelected}
                        aria-label={`Xem chi tiết ca của ${row.employeeName || row.employeeId}, thời gian ${row.startTime} đến ${row.endTime}`}
                      />
                    );
                  })
                )}
              </AgendaGroup>
            );
          })}
        </div>
      )}
    </div>
  );
}
