'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subMonths
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { commonUiCopy, shiftUiCopy } from '@/lib/app-copy';
import { cn } from '@/lib/utils';
import { useDepartmentsQuery, employeesQueryOptions } from '@/features/employees';
import {
  shiftsRosterQueryOptions,
  type ShiftRosterRow
} from '../api/queries';

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function toIsoDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return shiftUiCopy.roster.formatDuration(hours, remainder);
}

export function ScheduleCalendarView() {
  const [viewMonth, setViewMonth] = React.useState(() => new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [departmentId, setDepartmentId] = React.useState('');
  const [employeeId, setEmployeeId] = React.useState('');
  const [employeePopoverOpen, setEmployeePopoverOpen] = React.useState(false);
  const [employeeSearch, setEmployeeSearch] = React.useState('');
  const [detailOpen, setDetailOpen] = React.useState(false);

  const departmentsQuery = useDepartmentsQuery();
  const employeesQuery = useQuery(employeesQueryOptions({ limit: 500 }));

  const employeeOptions = React.useMemo(
    () =>
      (employeesQuery.data?.employees ?? []).map((emp) => ({
        value: emp.id,
        label: `${emp.firstName} ${emp.lastName}${emp.employeeCode ? ` (${emp.employeeCode})` : ''}`.trim()
      })),
    [employeesQuery.data?.employees]
  );

  const filteredEmployees = React.useMemo(() => {
    if (!employeeSearch) return employeeOptions;
    const term = normalize(employeeSearch);
    return employeeOptions.filter((opt) => normalize(opt.label).includes(term));
  }, [employeeOptions, employeeSearch]);

  // Fetch roster data for the full visible month
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);

  const rosterQuery = useQuery(
    shiftsRosterQueryOptions({
      from: toIsoDate(monthStart),
      to: toIsoDate(monthEnd),
      ...(employeeId ? { employeeId } : {}),
      ...(departmentId ? { departmentId } : {})
    })
  );

  // Group roster rows by date
  const rowsByDate = React.useMemo(() => {
    const map = new Map<string, ShiftRosterRow[]>();
    if (!rosterQuery.data?.rows) return map;
    for (const row of rosterQuery.data.rows) {
      const existing = map.get(row.workDate) ?? [];
      existing.push(row);
      map.set(row.workDate, existing);
    }
    return map;
  }, [rosterQuery.data?.rows]);

  // Dates that have assignments
  const datesWithData = React.useMemo(
    () =>
      Array.from(rowsByDate.keys())
        .filter((dateStr) => (rowsByDate.get(dateStr)?.length ?? 0) > 0)
        .map((dateStr) => new Date(dateStr + 'T00:00:00')),
    [rowsByDate]
  );

  // Rows for the selected date
  const selectedRows = React.useMemo(() => {
    if (!selectedDate) return [];
    const key = toIsoDate(selectedDate);
    return rowsByDate.get(key) ?? [];
  }, [rowsByDate, selectedDate]);

  function handleDayClick(day: Date) {
    setSelectedDate(day);
    setDetailOpen(true);
  }

  function handlePrevMonth() {
    setViewMonth((prev) => subMonths(prev, 1));
  }

  function handleNextMonth() {
    setViewMonth((prev) => addMonths(prev, 1));
  }

  // Days from previous/next month that overflow into view
  const firstDayOfMonth = monthStart.getDay();
  const daysFromPrevMonth = firstDayOfMonth;
  const prevMonthStart = subMonths(monthStart, 1);
  const prevMonthDates = Array.from({ length: daysFromPrevMonth }, (_, i) =>
    addDays(endOfMonth(prevMonthStart), -(daysFromPrevMonth - 1) + i)
  );

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <h2 className='text-lg font-semibold'>{shiftUiCopy.tabs.schedule}</h2>
      {/* Filters */}
      <div className='flex flex-wrap items-end gap-3 rounded-lg border p-4'>
        <div className='flex flex-col gap-2 text-sm'>
          <span className='font-medium'>{shiftUiCopy.schedule.departmentLabel}</span>
          <Select
            value={departmentId}
            onValueChange={(value) =>
              setDepartmentId(value === '__all__' ? '' : value)
            }
          >
            <SelectTrigger className='w-44'>
              <SelectValue placeholder={shiftUiCopy.schedule.allDepartments} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>{shiftUiCopy.schedule.allDepartments}</SelectItem>
              {(departmentsQuery.data ?? []).map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex flex-col gap-2 text-sm'>
          <span className='font-medium'>Nhân viên</span>
          <Popover open={employeePopoverOpen} onOpenChange={(next) => { setEmployeePopoverOpen(next); if (!next) setEmployeeSearch(''); }}>
            <PopoverTrigger asChild>
              <Button variant='outline' role='combobox' aria-expanded={employeePopoverOpen} className='w-56 justify-between font-normal'>
                {employeeOptions.find((o) => o.value === employeeId)?.label ??
                  shiftUiCopy.schedule.allEmployees}
                <Icons.chevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={commonUiCopy.searchByName}
                  value={employeeSearch}
                  onValueChange={setEmployeeSearch}
                />
                <CommandList>
                  <CommandEmpty>{commonUiCopy.noEmployeesFound}</CommandEmpty>
                  <CommandGroup>
                    {!employeeSearch && (
                      <CommandItem
                        value='__all__'
                        onSelect={() => {
                          setEmployeeId('');
                          setEmployeePopoverOpen(false);
                          setEmployeeSearch('');
                        }}
                      >
                        <Icons.check className={cn('mr-2 h-4 w-4', !employeeId ? 'opacity-100' : 'opacity-0')} />
                        {shiftUiCopy.schedule.allEmployees}
                      </CommandItem>
                    )}
                    {filteredEmployees.map((opt) => (
                      <CommandItem
                        key={opt.value}
                        value={opt.value}
                        onSelect={() => {
                          setEmployeeId(opt.value);
                          setEmployeePopoverOpen(false);
                          setEmployeeSearch('');
                        }}
                      >
                        <Icons.check className={cn('mr-2 h-4 w-4', employeeId === opt.value ? 'opacity-100' : 'opacity-0')} />
                        {opt.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Error state */}
      {rosterQuery.error ? (
        <QueryErrorAlert
          error={rosterQuery.error as Error & { digest?: string }}
          subject={shiftUiCopy.schedule.subject}
          onRetry={() => void rosterQuery.refetch()}
        />
      ) : null}

      {/* Calendar + legend */}
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]'>
        <div className='rounded-lg border p-2'>
          {/* Month navigation */}
          <div className='flex items-center justify-between px-3 py-2'>
            <Button variant='ghost' size='icon' onClick={handlePrevMonth}>
              <Icons.chevronLeft className='h-4 w-4' />
            </Button>
            <span className='text-sm font-semibold'>
              {format(viewMonth, 'MMMM yyyy', { locale: vi })}
            </span>
            <Button variant='ghost' size='icon' onClick={handleNextMonth}>
              <Icons.chevronRight className='h-4 w-4' />
            </Button>
          </div>

          {/* Day-of-week headers */}
          <div className='mb-1 grid grid-cols-7 px-1'>
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d) => (
              <div
                key={d}
                className='text-muted-foreground flex h-8 items-center justify-center text-xs font-medium'
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {rosterQuery.isLoading ? (
            <CalendarSkeleton />
          ) : (
            <div className='grid grid-cols-7 gap-px px-1'>
              {/* Previous month overflow days */}
              {prevMonthDates.map((date) => (
                <div
                  key={toIsoDate(date)}
                  className='text-muted-foreground/30 flex h-10 items-center justify-center text-sm'
                >
                  {date.getDate()}
                </div>
              ))}
              {/* Current month days */}
              {Array.from({ length: monthEnd.getDate() }, (_, i) => {
                const date = addDays(monthStart, i);
                const dateStr = toIsoDate(date);
                const dayRows = rowsByDate.get(dateStr);
                const hasData = (dayRows?.length ?? 0) > 0;
                const isToday = isSameDay(date, new Date());
                const isSelected = selectedDate && isSameDay(date, selectedDate);

                return (
                  <button
                    key={dateStr}
                    type='button'
                    onClick={() => handleDayClick(date)}
                    className={cn(
                      'relative flex h-10 flex-col items-center justify-center rounded-md text-sm transition-colors hover:bg-accent',
                      isToday && 'font-semibold',
                      isSelected && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                      !isSelected && !isToday && 'hover:bg-accent'
                    )}
                  >
                    <span className={cn(isToday && !isSelected && 'text-primary')}>
                      {date.getDate()}
                    </span>
                    {hasData && (
                      <span
                        className={cn(
                          'mt-0.5 h-1 w-1 rounded-full',
                          isSelected ? 'bg-primary-foreground' : 'bg-primary'
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar legend / summary */}
        <div className='flex flex-col gap-3 rounded-2xl border p-4'>
          <h3 className='text-sm font-semibold'>{format(viewMonth, 'MMMM yyyy', { locale: vi })}</h3>
          {rosterQuery.isLoading ? (
            <CalendarSkeleton />
          ) : (
            <>
              <div className='flex flex-col gap-2 text-sm text-muted-foreground'>
                <div className='flex items-center justify-between'>
                  <span>Tổng số ngày có ca</span>
                  <span className='font-medium text-foreground'>{datesWithData.length}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span>Tổng số lượt phân ca</span>
                  <span className='font-medium text-foreground'>
                    {rosterQuery.data?.rows.length ?? 0}
                  </span>
                </div>
              </div>
              <div className='mt-2 flex items-center gap-2 text-xs text-muted-foreground'>
                <span className='inline-block h-2 w-2 rounded-full bg-primary' />
                <span>Có lịch làm việc</span>
              </div>
              {selectedDate && (
                <div className='mt-2 rounded-md bg-accent/50 p-3 text-sm'>
                  <p className='font-medium'>{format(selectedDate, 'dd/MM/yyyy')}</p>
                  <p className='mt-1 text-muted-foreground'>
                    {selectedRows.length > 0
                      ? shiftUiCopy.schedule.employeesAssigned.replace('{count}', String(selectedRows.length))
                      : shiftUiCopy.schedule.noAssignments}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Day detail sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side='right' className='w-full sm:max-w-lg'>
          <SheetHeader>
            <SheetTitle>
              {selectedDate ? format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: vi }) : ''}
            </SheetTitle>
            <SheetDescription>
              {shiftUiCopy.schedule.selectedDateTitle.replace(
                '{date}',
                selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: vi }) : ''
              )}
            </SheetDescription>
          </SheetHeader>

          <div className='mt-4 flex-1 overflow-auto'>
            {selectedRows.length === 0 ? (
              <div className='text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm'>
                {shiftUiCopy.schedule.noAssignments}
              </div>
            ) : (
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{commonUiCopy.employee}</TableHead>
                      <TableHead>{shiftUiCopy.schedule.templateLabel}</TableHead>
                      <TableHead>{shiftUiCopy.schedule.timeRangeLabel}</TableHead>
                      <TableHead>{shiftUiCopy.schedule.durationLabel}</TableHead>
                      <TableHead>{shiftUiCopy.schedule.statusLabel}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRows.map((row) => (
                      <TableRow key={`${row.assignmentId}-${row.workDate}`}>
                        <TableCell>
                          <div className='flex flex-col'>
                            <span className='text-sm font-medium'>{row.employeeName}</span>
                            <span className='text-muted-foreground text-xs'>{row.employeeId}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className='text-sm'>{row.shiftTemplateName}</span>
                        </TableCell>
                        <TableCell className='text-sm whitespace-nowrap'>
                          {row.startTime} - {row.endTime}
                          {row.overnight ? ' (+1)' : ''}
                        </TableCell>
                        <TableCell className='text-sm'>
                          {formatMinutes(row.scheduledMinutes)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={row.assignmentStatus === 'published' ? 'default' : 'secondary'}
                            className='whitespace-nowrap'
                          >
                            {row.assignmentStatus === 'published' ? 'Đã công bố' : row.assignmentStatus === 'planned' ? 'Đã lên kế hoạch' : row.assignmentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>                          </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

        </SheetContent>
      </Sheet>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4 rounded-2xl border border-border/60 bg-background/70 p-4'>
      <div className='flex items-center justify-between gap-4'>
        <div className='space-y-2'>
          <div className='h-4 w-40 rounded bg-muted' />
          <div className='h-3 w-64 rounded bg-muted' />
        </div>
        <div className='h-9 w-32 rounded bg-muted' />
      </div>
      <div className='h-11 w-full rounded-xl bg-muted' />
      <div className='h-96 w-full rounded-2xl bg-muted' />
      <div className='h-10 w-full rounded-xl bg-muted' />
    </div>
  );
}
