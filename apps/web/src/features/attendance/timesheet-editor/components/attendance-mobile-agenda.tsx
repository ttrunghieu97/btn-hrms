'use client';

import * as React from 'react';
import { format, isToday } from 'date-fns';
import type { TimesheetWorkspaceEmployee, TimesheetWorkspaceRecord } from '../types';
import {
  DAY_FULL,
  getDayOfWeek,
  isWeekend,
  fmtTime,
  fmtWork,
  dayDate,
  daysInMonth,
} from '../detail-columns';
import { AgendaGroup, AgendaItem } from '@/components/ui/agenda';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AttendanceMobileAgendaProps {
  period: string;
  employees: TimesheetWorkspaceEmployee[];
  selectedEmployee: TimesheetWorkspaceEmployee;
  records: TimesheetWorkspaceRecord[];
  canEdit: boolean;
  onSelectEmployee: (emp: TimesheetWorkspaceEmployee) => void;
  onAdjust: (employee: TimesheetWorkspaceEmployee, workDate: string) => void;
  navigatePeriod?: (delta: number) => void;
  periodStatus?: string | null;
  onToggleMatrix?: () => void;
}

function getInitials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getStatusBadge(status?: string | null, weekend?: boolean, hasHours?: boolean) {
  if (!status) {
    if (weekend && !hasHours) {
      return (
        <Badge variant='outline' className='text-xs text-muted-foreground border-border/80 bg-muted/30'>
          Nghỉ tuần
        </Badge>
      );
    }
    return (
      <Badge variant='outline' className='text-xs text-muted-foreground border-border/80 bg-muted/30'>
        Chưa có công
      </Badge>
    );
  }

  switch (status) {
    case 'present':
      return (
        <Badge variant='default' className='text-xs bg-emerald-600 text-white hover:bg-emerald-600/90'>
          Có mặt
        </Badge>
      );
    case 'late':
      return (
        <Badge variant='outline' className='text-xs border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10 font-medium'>
          Đi muộn
        </Badge>
      );
    case 'early_leave':
      return (
        <Badge variant='outline' className='text-xs border-orange-500/50 text-orange-700 dark:text-orange-400 bg-orange-500/10 font-medium'>
          Về sớm
        </Badge>
      );
    case 'leave':
      return (
        <Badge variant='secondary' className='text-xs bg-blue-500/15 text-blue-700 dark:text-blue-300 font-medium'>
          Nghỉ phép
        </Badge>
      );
    case 'holiday':
      return (
        <Badge variant='secondary' className='text-xs bg-purple-500/15 text-purple-700 dark:text-purple-300 font-medium'>
          Nghỉ lễ
        </Badge>
      );
    case 'absent':
      return (
        <Badge variant='destructive' className='text-xs'>
          Vắng mặt
        </Badge>
      );
    default:
      return (
        <Badge variant='outline' className='text-xs'>
          {status}
        </Badge>
      );
  }
}

export function AttendanceMobileAgenda({
  period,
  employees,
  selectedEmployee,
  records,
  canEdit,
  onSelectEmployee,
  onAdjust,
  navigatePeriod,
  periodStatus,
}: AttendanceMobileAgendaProps) {
  const [empSearch, setEmpSearch] = React.useState('');
  const [dayFilter, setDayFilter] = React.useState<'all' | 'work' | 'absence' | 'weekend'>('all');

  const totalDays = React.useMemo(() => daysInMonth(period), [period]);

  // Filtered employees for the picker
  const filteredEmployees = React.useMemo(() => {
    if (!empSearch.trim()) return employees;
    const q = empSearch.toLowerCase().trim();
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q)
    );
  }, [employees, empSearch]);

  // Current employee index
  const currentIndex = employees.findIndex((e) => e.id === selectedEmployee.id);
  const prevEmployee = currentIndex > 0 ? employees[currentIndex - 1] : null;
  const nextEmployee = currentIndex < employees.length - 1 ? employees[currentIndex + 1] : null;

  // Map employee's daily records
  const empRecordsByDate = React.useMemo(() => {
    const map = new Map<string, TimesheetWorkspaceRecord>();
    for (const r of records) {
      if (r.employeeId === selectedEmployee.id) {
        map.set(r.workDate, r);
      }
    }
    return map;
  }, [records, selectedEmployee.id]);

  // Generate list of days
  const daysList = React.useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const day = i + 1;
      const dateStr = dayDate(period, day);
      const dayOfWeekIdx = getDayOfWeek(dateStr);
      const fullDay = DAY_FULL[dayOfWeekIdx] ?? '';
      const weekend = isWeekend(dateStr);
      const rec = empRecordsByDate.get(dateStr);
      const parsedDate = new Date(`${dateStr}T00:00:00`);
      const currentDay = !isNaN(parsedDate.getTime()) && isToday(parsedDate);

      return {
        day,
        dateStr,
        fullDay,
        weekend,
        rec,
        isCurrentDay: currentDay,
      };
    });
  }, [period, totalDays, empRecordsByDate]);

  // Filter days based on tab
  const filteredDays = React.useMemo(() => {
    if (dayFilter === 'all') return daysList;
    if (dayFilter === 'work') {
      return daysList.filter((d) => (d.rec?.workedMinutes ?? 0) > 0 || d.rec?.status === 'present');
    }
    if (dayFilter === 'absence') {
      return daysList.filter(
        (d) =>
          d.rec?.status === 'absent' ||
          d.rec?.status === 'leave' ||
          d.rec?.status === 'late' ||
          d.rec?.status === 'early_leave'
      );
    }
    if (dayFilter === 'weekend') {
      return daysList.filter((d) => d.weekend);
    }
    return daysList;
  }, [daysList, dayFilter]);

  const isPeriodOpen = periodStatus === 'open';

  return (
    <div className='flex flex-col gap-3.5 w-full'>
      {/* ── Employee Selection & Fast Switch Bar ── */}
      <div className='flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card p-3 shadow-2xs'>
        <div className='flex items-center justify-between gap-2'>
          <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
            Nhân sự đang xem
          </span>
          <div className='flex items-center gap-1.5'>
            <Badge
              variant='outline'
              className={cn(
                'text-[10px] font-mono font-medium',
                selectedEmployee.verificationStatus === 'done'
                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10'
              )}
            >
              {selectedEmployee.verificationStatus === 'done' ? 'Đã chốt công' : 'Chưa chốt'}
            </Badge>
            <Badge
              variant='outline'
              className={cn(
                'text-[10px] font-mono',
                isPeriodOpen ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/40' : 'text-muted-foreground bg-muted'
              )}
            >
              Kỳ: {isPeriodOpen ? 'Đang mở' : 'Đã đóng'}
            </Badge>
          </div>
        </div>

        {/* Selected Employee Info Card */}
        <div className='flex items-center gap-3'>
          <Avatar className='size-11 shrink-0'>
            <AvatarFallback className='text-sm bg-primary/10 text-primary font-semibold'>
              {getInitials(selectedEmployee.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-col min-w-0 flex-1'>
            <span className='font-semibold text-sm sm:text-base text-foreground truncate'>
              {selectedEmployee.fullName}
            </span>
            <span className='text-xs text-muted-foreground truncate'>
              Mã: {selectedEmployee.employeeCode} · {selectedEmployee.departmentName || 'Chưa phân phòng'}
            </span>
          </div>
        </div>

        {/* Employee Switcher Dropdown */}
        <div className='grid grid-cols-[1fr_auto_auto] gap-2 pt-1'>
          <Select
            value={selectedEmployee.id}
            onValueChange={(id) => {
              const target = employees.find((e) => e.id === id);
              if (target) onSelectEmployee(target);
            }}
          >
            <SelectTrigger
              className='h-11 min-h-[44px] text-xs sm:text-sm bg-background font-medium'
              aria-label='Chọn nhân viên khác'
            >
              <SelectValue placeholder='Chọn nhân viên…' />
            </SelectTrigger>
            <SelectContent className='max-h-[300px]'>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id} className='text-xs py-2'>
                  {e.fullName} ({e.employeeCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type='button'
            variant='outline'
            size='icon'
            disabled={!prevEmployee}
            onClick={() => prevEmployee && onSelectEmployee(prevEmployee)}
            aria-label='Nhân viên trước đó'
            className='h-11 w-11 min-h-[44px] min-w-[44px] shrink-0'
          >
            <Icons.chevronLeft className='size-5' />
          </Button>

          <Button
            type='button'
            variant='outline'
            size='icon'
            disabled={!nextEmployee}
            onClick={() => nextEmployee && onSelectEmployee(nextEmployee)}
            aria-label='Nhân viên tiếp theo'
            className='h-11 w-11 min-h-[44px] min-w-[44px] shrink-0'
          >
            <Icons.chevronRight className='size-5' />
          </Button>
        </div>
      </div>

      {/* ── Period Month Navigation & Day Filter Pills ── */}
      <div className='flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-2.5 shadow-2xs'>
        <div className='flex items-center justify-between gap-1'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            aria-label='Tháng trước'
            disabled={!navigatePeriod}
            onClick={() => navigatePeriod?.(-1)}
            className='h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg shrink-0'
          >
            <Icons.chevronLeft className='size-5' />
          </Button>

          <div className='flex flex-col items-center justify-center flex-1 min-w-0 px-2'>
            <span className='font-bold text-sm sm:text-base font-mono text-foreground'>
              Tháng {period}
            </span>
            <span className='text-[11px] text-muted-foreground'>
              Tổng số {totalDays} ngày trong kỳ công
            </span>
          </div>

          <Button
            type='button'
            variant='outline'
            size='icon'
            aria-label='Tháng sau'
            disabled={!navigatePeriod}
            onClick={() => navigatePeriod?.(1)}
            className='h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg shrink-0'
          >
            <Icons.chevronRight className='size-5' />
          </Button>
        </div>

        {/* ── Filter Pills: Tất cả, Ngày đi làm, Vắng/Ngoại lệ, Cuối tuần ── */}
        <div
          role='tablist'
          aria-label='Lọc ngày trong tháng'
          className='flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar -mx-1 px-1'
        >
          {[
            { id: 'all', label: `Tất cả (${daysList.length})` },
            { id: 'work', label: 'Có đi làm' },
            { id: 'absence', label: 'Vắng / Nghỉ' },
            { id: 'weekend', label: 'Cuối tuần' },
          ].map((tab) => {
            const isSelected = dayFilter === tab.id;
            return (
              <button
                key={tab.id}
                type='button'
                role='tab'
                aria-selected={isSelected}
                onClick={() => setDayFilter(tab.id as any)}
                className={cn(
                  'inline-flex min-h-[44px] items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium shrink-0 transition-colors border',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-2xs font-semibold'
                    : 'bg-background text-muted-foreground border-border/70 hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Daily Agenda Cards ── */}
      {filteredDays.length === 0 ? (
        <AppEmptyState
          icon={<Icons.calendar className='size-10' />}
          title='Không có ngày nào phù hợp'
          description='Thử đổi bộ lọc ngày để xem danh sách công chi tiết.'
          action={
            <Button
              type='button'
              variant='outline'
              onClick={() => setDayFilter('all')}
              className='min-h-[44px]'
            >
              Xem tất cả các ngày
            </Button>
          }
          className='my-4 p-6'
        />
      ) : (
        <div className='flex flex-col gap-4'>
          {filteredDays.map((d) => {
            const hasHours = (d.rec?.workedMinutes ?? 0) > 0;
            const workedHours = d.rec?.workedMinutes
              ? (d.rec.workedMinutes / 60).toFixed(1)
              : '0.0';
            const otHours = d.rec?.overtimeMinutes
              ? (d.rec.overtimeMinutes / 60).toFixed(1)
              : null;
            const cong = fmtWork(d.rec?.workedMinutes);

            const morningIn = fmtTime(d.rec?.checkInMorning);
            const morningOut = fmtTime(d.rec?.checkOutMorning);
            const afternoonIn = fmtTime(d.rec?.checkInAfternoon);
            const afternoonOut = fmtTime(d.rec?.checkOutAfternoon);

            const hasTimeEntries =
              morningIn !== '-' ||
              morningOut !== '-' ||
              afternoonIn !== '-' ||
              afternoonOut !== '-';

            return (
              <AgendaGroup
                key={d.dateStr}
                title={`${d.fullDay}, ${String(d.day).padStart(2, '0')}/${period.split('-')[1]}`}
                isToday={d.isCurrentDay}
              >
                <AgendaItem
                  title={
                    <span className='font-semibold text-sm'>
                      {d.rec?.note || (d.weekend ? 'Ngày nghỉ tuần' : 'Ngày làm việc')}
                    </span>
                  }
                  badge={getStatusBadge(d.rec?.status, d.weekend, hasHours)}
                  timeRange={
                    hasTimeEntries
                      ? `Sáng: ${morningIn} - ${morningOut} · Chiều: ${afternoonIn} - ${afternoonOut}`
                      : undefined
                  }
                  details={
                    <div className='flex items-center gap-3 text-xs flex-wrap'>
                      <span className='font-medium text-foreground'>
                        Tổng: {workedHours}h ({cong} công)
                      </span>
                      {otHours && Number(otHours) > 0 && (
                        <span className='text-amber-700 dark:text-amber-400 font-medium'>
                          OT: +{otHours}h
                        </span>
                      )}
                    </div>
                  }
                  actions={
                    canEdit && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => onAdjust(selectedEmployee, d.dateStr)}
                        className='min-h-[44px] sm:min-h-[36px] w-full text-xs font-medium justify-center'
                      >
                        <Icons.edit className='mr-1.5 size-4 text-primary' />
                        {d.rec ? 'Điều chỉnh công' : 'Chấm công bù'}
                      </Button>
                    )
                  }
                  aria-label={`Chi tiết công ngày ${d.day} tháng ${period} của ${selectedEmployee.fullName}`}
                />
              </AgendaGroup>
            );
          })}
        </div>
      )}
    </div>
  );
}
