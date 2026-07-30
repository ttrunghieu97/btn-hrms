'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { attendanceUiCopy } from '@/lib/app-copy';
import { formatTime } from '../../utils/attendance-utils';
import { useTimesheetQuery } from '../../api/timekeeping-queries';
import { employeesQueryOptions } from '@/features/employees';
import {
  formatMinutes,
  getOutcomeLabel,
  getOutcomeBadgeVariant,
  getExceptionStateLabel,
  getExceptionStateBadgeVariant,
} from '../utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DateRange, TimesheetRow } from '../types';
import type { EmployeeResponseDto } from '@/api/generated/model';

function TimesheetSkeleton() {
  return (
    <div className='space-y-4'>
      <Card>
        <CardContent className='py-4'>
          <div className='grid grid-cols-4 gap-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='space-y-2'>
                <Skeleton className='h-3 w-20' />
                <Skeleton className='h-6 w-16' />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className='space-y-2'>
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className='h-10 w-full' />
        ))}
      </div>
    </div>
  );
}

export function OverviewTab({ dateRange }: { dateRange: DateRange }) {
  const [employeeId, setEmployeeId] = React.useState<string>('all');
  const { data: empData } = useQuery(employeesQueryOptions({ limit: 100 }));
  const employeesList = empData?.employees ?? [];

  const { data, error, isLoading, refetch } = useTimesheetQuery({
    from: dateRange.from,
    to: dateRange.to,
    employeeId: employeeId === 'all' ? undefined : employeeId,
    limit: 500,
    includeUnresolvedAsPayable: true,
  });

  const rows: TimesheetRow[] = data?.records ?? [];
  const totals = data?.totals ?? null;

  if (isLoading) return <TimesheetSkeleton />;
  if (error) return <QueryErrorAlert error={error} subject={attendanceUiCopy.timekeeping.timesheetData} onRetry={() => refetch()} />;

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <span className='text-sm font-medium text-muted-foreground'>Nhân viên:</span>
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger className='w-[240px]'>
            <SelectValue placeholder='Chọn nhân viên' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Tất cả nhân viên</SelectItem>
            {employeesList.map((emp: EmployeeResponseDto) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.lastName} {emp.firstName} ({emp.employeeCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className='py-3'>
          <CardTitle className='text-sm font-medium'>{attendanceUiCopy.timekeeping.periodOverview}</CardTitle>
        </CardHeader>
        <CardContent className='pb-3'>
          <div className='grid grid-cols-2 gap-4 text-sm sm:grid-cols-4'>
            <div>
              <span className='text-muted-foreground'>{attendanceUiCopy.timekeeping.workedHours}</span>
              <p className='text-lg font-semibold'>{totals ? formatMinutes(totals.workedMinutes) : '--'}</p>
            </div>
            <div>
              <span className='text-muted-foreground'>{attendanceUiCopy.timekeeping.payableHours}</span>
              <p className='text-lg font-semibold'>{totals ? formatMinutes(totals.payableMinutes) : '--'}</p>
            </div>
            <div>
              <span className='text-muted-foreground'>{attendanceUiCopy.timekeeping.lateEarly}</span>
              <p className='text-lg font-semibold'>
                {totals ? `${formatMinutes(totals.lateMinutes)} / ${formatMinutes(totals.earlyLeaveMinutes)}` : '--'}
              </p>
            </div>
            <div>
              <span className='text-muted-foreground'>{attendanceUiCopy.timekeeping.overtime}</span>
              <p className='text-lg font-semibold'>{totals ? formatMinutes(totals.overtimeMinutes) : '--'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{attendanceUiCopy.timekeeping.table.date}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.table.employee}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.table.shift}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.table.in}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.table.out}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.table.worked}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.table.validHours}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.table.late}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.table.early}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.table.ot}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.tabs.exceptions}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.table.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className='text-center text-muted-foreground'>
                  {attendanceUiCopy.emptyFiltered}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row: TimesheetRow, idx: number) => {
              const checkin = row.clockIn ?? row.morningCheckin ?? row.checkIn;
              const checkout = row.clockOut ?? row.afternoonCheckout ?? row.checkOut;
              const late = row.lateMinutes ?? 0;
              const early = row.earlyLeaveMinutes ?? 0;
              const overtime = row.overtimeMinutes ?? 0;
              const worked = row.workedMinutes ?? 0;
              const payable = row.payableMinutes ?? 0;
              const blockedReasons: string[] = row.blockedReasons ?? [];
              const isBlocked = payable < worked && blockedReasons.length > 0;

              return (
                <TableRow key={idx}>
                  <TableCell className='font-medium'>{row.date}</TableCell>
                  <TableCell className='font-medium'>
                    {row.employee ? `${row.employee.lastName} ${row.employee.firstName}` : '--'}
                    <div className='text-xs text-muted-foreground font-normal'>{row.employee?.employeeCode}</div>
                  </TableCell>
                  <TableCell>{row.shiftName || row.shiftCode || '--'}</TableCell>
                  <TableCell>{formatTime(checkin) || '--:--'}</TableCell>
                  <TableCell>{formatTime(checkout) || '--:--'}</TableCell>
                  <TableCell>{formatMinutes(worked)}</TableCell>
                  <TableCell>
                    <div className='flex items-center gap-1.5'>
                      <span className={isBlocked ? 'text-destructive font-semibold' : ''}>
                        {formatMinutes(payable)}
                      </span>
                      {isBlocked && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className='cursor-help text-destructive'>
                                <Icons.info className='h-4 w-4' />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className='max-w-xs'>
                              <p className='font-medium text-xs text-destructive mb-1'>Bị khóa giờ hợp lệ:</p>
                              <ul className='list-disc pl-3 text-xs space-y-0.5'>
                                {blockedReasons.map((reason, i) => (
                                  <li key={i}>{reason}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{late > 0 ? formatMinutes(late) : '--'}</TableCell>
                  <TableCell>{early > 0 ? formatMinutes(early) : '--'}</TableCell>
                  <TableCell>{overtime > 0 ? formatMinutes(overtime) : '--'}</TableCell>
                  <TableCell>
                    {row.exceptionState && row.exceptionState !== 'none' ? (
                      <Badge variant={getExceptionStateBadgeVariant(row.exceptionState)} className='h-5 px-1 text-[10px]'>
                        {getExceptionStateLabel(row.exceptionState)}
                      </Badge>
                    ) : (
                      <span className='text-muted-foreground text-xs'>--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getOutcomeBadgeVariant(row.attendanceOutcome ?? '')} className='h-5 px-1 text-[10px]'>
                      {getOutcomeLabel(row.attendanceOutcome ?? '')}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
