'use client';

import * as React from 'react';
import { formatDateVN } from "@/lib/date";
import { addDays, format, parseISO, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { commonUiCopy, attendanceUiCopy } from '@/lib/app-copy';
import { formatTime, toDateString } from '../utils/attendance-utils';
import {
  useTimesheetQuery,
  useExceptionsQuery,
  useClockEventsQuery,
  useManualCorrectionMutation,
  useResolveExceptionMutation,
} from '../api/timekeeping-queries';
import { useQuery } from '@tanstack/react-query';
import { employeesQueryOptions } from '@/features/employees';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const CURRENT = format(new Date(), 'yyyy-MM');

export function TimekeepingView() {
  const [dateRange, setDateRange] = React.useState({ from: CURRENT + '-01', to: toDateString(new Date()) });
  const [tab, setTab] = React.useState('timesheet');

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='icon' onClick={() => {
            const from = parseISO(dateRange.from);
            const to = parseISO(dateRange.to);
            setDateRange({
              from: toDateString(subDays(from, 30)),
              to: toDateString(subDays(to, 30)),
            });
          }}>
            <Icons.chevronLeft className='h-4 w-4' />
          </Button>
          <span className='text-sm font-medium'>
            {format(parseISO(dateRange.from), 'dd/MM/yyyy')} - {format(parseISO(dateRange.to), 'dd/MM/yyyy')}
          </span>
          <Button variant='outline' size='icon' onClick={() => {
            const from = parseISO(dateRange.from);
            const to = parseISO(dateRange.to);
            setDateRange({
              from: toDateString(addDays(from, 30)),
              to: toDateString(addDays(to, 30)),
            });
          }}>
            <Icons.chevronRight className='h-4 w-4' />
          </Button>
        </div>
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Icons.info className='h-4 w-4' />
          {attendanceUiCopy.table.overtimeHoursLabel} tự động tính từ giờ vượt {'>'}8h/ngày
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value='timesheet'>{attendanceUiCopy.timekeeping.tabs.timesheet}</TabsTrigger>
          <TabsTrigger value='exceptions'>{attendanceUiCopy.timekeeping.tabs.exceptions}</TabsTrigger>
          <TabsTrigger value='adjust'>{attendanceUiCopy.timekeeping.tabs.adjust}</TabsTrigger>
        </TabsList>

        <TabsContent value='timesheet' className='mt-4'>
          <TimesheetView dateRange={dateRange} />
        </TabsContent>

        <TabsContent value='exceptions' className='mt-4'>
          <ExceptionsView dateRange={dateRange} />
        </TabsContent>

        <TabsContent value='adjust' className='mt-4'>
          <AdjustView dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TimesheetView({ dateRange }: { dateRange: { from: string; to: string } }) {
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

  const rows = data?.records ?? [];
  const totals = data?.totals ?? null;

  if (isLoading) return <TimesheetSkeleton />;
  if (error) return <QueryErrorAlert error={error} subject={attendanceUiCopy.timekeeping.timesheetData} onRetry={() => refetch()} />;

  const formatMinutes = (m: number | null | undefined) => {
    if (m == null) return '--';
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}h${min > 0 ? min + 'p' : ''}`;
  };

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
            {employeesList.map((emp) => (
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
            {rows.map((row: any, idx: number) => {
              const checkin = row.clockIn ?? row.morningCheckin ?? row.checkIn;
              const checkout = row.clockOut ?? row.afternoonCheckout ?? row.checkOut;
              const late = row.lateMinutes ?? 0;
              const early = row.earlyLeaveMinutes ?? 0;
              const overtime = row.overtimeMinutes ?? 0;
              const worked = row.workedMinutes ?? 0;
              const payable = row.payableMinutes ?? 0;
              const blockedReasons: string[] = row.blockedReasons ?? [];
              const isBlocked = payable < worked && blockedReasons.length > 0;

              const getOutcomeLabel = (outcome: string) => {
                switch (outcome) {
                  case 'present': return 'Có mặt';
                  case 'absent': return 'Vắng mặt';
                  case 'leave': return 'Nghỉ phép';
                  case 'holiday': return 'Ngày lễ';
                  case 'off': return 'Nghỉ';
                  case 'blocked': return 'Bị khóa';
                  default: return outcome || '--';
                }
              };

              const getOutcomeBadgeVariant = (outcome: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
                switch (outcome) {
                  case 'present': return 'default';
                  case 'absent': return 'destructive';
                  case 'leave': return 'secondary';
                  case 'holiday': return 'secondary';
                  case 'off': return 'outline';
                  case 'blocked': return 'destructive';
                  default: return 'outline';
                }
              };

              const getExceptionStateLabel = (state: string) => {
                switch (state) {
                  case 'pending': return 'Chờ xử lý';
                  case 'resolved': return 'Đã xử lý';
                  case 'closed': return 'Đã đóng';
                  default: return '';
                }
              };

              const getExceptionStateBadgeVariant = (state: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
                switch (state) {
                  case 'pending': return 'destructive';
                  case 'resolved': return 'default';
                  case 'closed': return 'secondary';
                  default: return 'outline';
                }
              };

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
                    <Badge variant={getOutcomeBadgeVariant(row.attendanceOutcome)} className='h-5 px-1 text-[10px]'>
                      {getOutcomeLabel(row.attendanceOutcome)}
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

function ExceptionsView({ dateRange }: { dateRange: { from: string; to: string } }) {
  const { data, error, isLoading, refetch } = useExceptionsQuery({
    from: dateRange.from,
    to: dateRange.to,
    limit: 500,
  });

  const items = data?.records ?? [];
  const [selectedException, setSelectedException] = React.useState<any>(null);

  if (isLoading) return <div className='space-y-2'>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className='h-10 w-full' />)}</div>;
  if (error) return <QueryErrorAlert error={error} subject={attendanceUiCopy.timekeeping.exceptionSubject} onRetry={() => refetch()} />;

  const statusLabel = (s: string) => {
    if (s === 'pending') return attendanceUiCopy.timekeeping.exceptionStatus.pending;
    if (s === 'resolved') return attendanceUiCopy.timekeeping.exceptionStatus.resolved;
    if (s === 'closed') return attendanceUiCopy.timekeeping.exceptionStatus.closed;
    return s;
  };
  const statusVariant = (s: string): 'destructive' | 'default' | 'secondary' | 'outline' => {
    if (s === 'pending') return 'destructive';
    if (s === 'resolved') return 'default';
    if (s === 'closed') return 'secondary';
    return 'outline';
  };

  return (
    <>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{attendanceUiCopy.timekeeping.exceptionTable.date}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.exceptionTable.employee}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.exceptionTable.type}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.exceptionTable.description}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.exceptionTable.status}</TableHead>
              <TableHead>{attendanceUiCopy.timekeeping.exceptionTable.createdAt}</TableHead>
              <TableHead className='text-right'>{attendanceUiCopy.timekeeping.exceptionTable.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className='text-center text-muted-foreground'>{attendanceUiCopy.timekeeping.noExceptions}</TableCell>
              </TableRow>
            )}
            {items.map((item: any, idx: number) => (
              <TableRow key={idx}>
                <TableCell>{item.date ?? item.workDate ?? '--'}</TableCell>
                <TableCell>{item.employeeName ?? (item.employee?.firstName ? `${item.employee.firstName} ${item.employee.lastName}` : '--')}</TableCell>
                <TableCell>{item.type ?? item.exceptionType ?? item.reason ?? '--'}</TableCell>
                <TableCell className='max-w-xs truncate text-muted-foreground'>{item.description ?? item.note ?? '--'}</TableCell>
                <TableCell><Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge></TableCell>
                <TableCell>{item.createdAt ? formatDateVN(item.createdAt) : '--'}</TableCell>
                <TableCell className='text-right'>
                  {item.status === 'pending' && (
                    <Button variant='outline' size='sm' onClick={() => setSelectedException(item)}>
                      {attendanceUiCopy.timekeeping.exceptionTable.resolve}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ExceptionResolveDialog
        exception={selectedException}
        onClose={() => {
          setSelectedException(null);
          refetch().catch(() => undefined);
        }}
      />
    </>
  );
}

function AdjustView({ dateRange }: { dateRange: { from: string; to: string } }) {
  const [open, setOpen] = React.useState(false);
  const { data, error, isLoading, refetch } = useClockEventsQuery({
    from: dateRange.from,
    to: dateRange.to,
    source: 'manual',
    limit: 500,
  });

  const adjustments = data?.records ?? [];

  return (
    <>
      <div className='flex flex-col gap-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-3'>
            <div>
              <CardTitle className='text-base'>{attendanceUiCopy.timekeeping.adjustTitle}</CardTitle>
              <p className='text-sm text-muted-foreground mt-1'>
                {attendanceUiCopy.timekeeping.adjustDescription}
              </p>
            </div>
            <Button onClick={() => setOpen(true)}>
              <Icons.add className='mr-2 h-4 w-4' />
              {attendanceUiCopy.timekeeping.createAdjust}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-2'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            ) : error ? (
              <QueryErrorAlert error={error} subject={attendanceUiCopy.timekeeping.adjustSubject} onRetry={() => refetch()} />
            ) : (
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{attendanceUiCopy.timekeeping.adjustTable.date}</TableHead>
                      <TableHead>{attendanceUiCopy.timekeeping.adjustTable.employee}</TableHead>
                      <TableHead>{attendanceUiCopy.timekeeping.adjustTable.eventType}</TableHead>
                      <TableHead>{attendanceUiCopy.timekeeping.adjustTable.time}</TableHead>
                      <TableHead>{attendanceUiCopy.timekeeping.adjustTable.note}</TableHead>
                      <TableHead>{attendanceUiCopy.timekeeping.adjustTable.creator}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className='text-center text-muted-foreground py-6'>
                          {attendanceUiCopy.timekeeping.adjustTable.empty}
                        </TableCell>
                      </TableRow>
                    )}
                    {adjustments.map((adj: any) => {
                      const empName = adj.employee ? `${adj.employee.firstName} ${adj.employee.lastName}` : '--';
                      const eventTypeLabel = adj.type === 'check_in' ? attendanceUiCopy.timekeeping.adjustTable.checkIn : adj.type === 'check_out' ? attendanceUiCopy.timekeeping.adjustTable.checkOut : adj.type;
                      return (
                        <TableRow key={adj.id}>
                          <TableCell className='font-medium'>{adj.date}</TableCell>
                          <TableCell>
                            <div className='flex flex-col'>
                              <span>{empName}</span>
                              <span className='text-xs text-muted-foreground'>{adj.employee?.employeeCode || adj.employee?.code || ''}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={adj.type === 'check_in' ? 'default' : 'secondary'}>
                              {eventTypeLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className='font-mono'>{formatTime(adj.time)}</TableCell>
                          <TableCell className='max-w-xs truncate text-muted-foreground' title={adj.note || adj.reason}>
                            {adj.note || adj.reason || '--'}
                          </TableCell>
                          <TableCell>{adj.actorUserId ? attendanceUiCopy.timekeeping.adjustTable.systemCreator : 'Hệ thống'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CorrectionFormDialog open={open} onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          refetch().catch(() => undefined);
        }
      }} />
    </>
  );
}

function ExceptionResolveDialog({
  exception,
  onClose,
}: {
  exception: any;
  onClose: () => void;
}) {
  const resolveMutation = useResolveExceptionMutation();
  const [status, setStatus] = React.useState<'resolved' | 'closed'>('resolved');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (exception) {
      setStatus('resolved');
      setNote('');
    }
  }, [exception]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exception) return;
    resolveMutation.mutate(
      {
        id: exception.id,
        data: {
          status,
          note,
        },
      },
      {
        onSuccess: () => {
          toast.success(attendanceUiCopy.timekeeping.resolveDialog.toastSuccess);
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.message || attendanceUiCopy.timekeeping.resolveDialog.toastError);
        },
      }
    );
  };

  return (
    <Dialog open={!!exception} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-[425px]'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <DialogHeader>
            <DialogTitle>{attendanceUiCopy.timekeeping.resolveDialog.title}</DialogTitle>
            <DialogDescription>
              {attendanceUiCopy.timekeeping.resolveDialog.description
                .replace('{date}', exception?.date ?? exception?.workDate ?? '--')
                .replace('{name}', exception?.employeeName ?? (exception?.employee?.firstName ? `${exception.employee.firstName} ${exception.employee.lastName}` : '--'))}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='exception-type'>{attendanceUiCopy.timekeeping.resolveDialog.typeLabel}</Label>
              <div className='text-sm font-medium'>
                {exception?.type ?? exception?.exceptionType ?? exception?.reason ?? '--'}
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <Label htmlFor='resolve-status'>{attendanceUiCopy.timekeeping.resolveDialog.solutionLabel}</Label>
              <Select
                value={status}
                onValueChange={(val: any) => setStatus(val)}
              >
                <SelectTrigger id='resolve-status'>
                  <SelectValue placeholder={attendanceUiCopy.timekeeping.resolveDialog.selectStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='resolved'>{attendanceUiCopy.timekeeping.resolveDialog.optionResolved}</SelectItem>
                  <SelectItem value='closed'>{attendanceUiCopy.timekeeping.resolveDialog.optionClosed}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-2'>
              <Label htmlFor='resolve-note'>{attendanceUiCopy.timekeeping.resolveDialog.noteLabel}</Label>
              <Textarea
                id='resolve-note'
                placeholder={attendanceUiCopy.timekeeping.resolveDialog.notePlaceholder}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={resolveMutation.isPending}>
              {commonUiCopy.cancel}
            </Button>
            <Button type='submit' disabled={resolveMutation.isPending}>
              {resolveMutation.isPending && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
              {commonUiCopy.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CorrectionFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const employeesQuery = useQuery(employeesQueryOptions({ limit: 500 }));
  const correctionMutation = useManualCorrectionMutation();

  const [employeeId, setEmployeeId] = React.useState('');
  const [type, setType] = React.useState<'check_in' | 'check_out'>('check_in');
  const [workDate, setWorkDate] = React.useState(toDateString(new Date()));
  const [time, setTime] = React.useState('08:00');
  const [reason, setReason] = React.useState('');
  const [note, setNote] = React.useState('');

  const employees = React.useMemo(() => {
    return employeesQuery.data?.employees ?? [];
  }, [employeesQuery.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !reason) {
      toast.error(attendanceUiCopy.timekeeping.createAdjustDialog.toastValidation);
      return;
    }

    const eventTime = new Date(`${workDate}T${time}:00`).toISOString();

    correctionMutation.mutate(
      {
        employeeId,
        type,
        workDate,
        eventTime,
        reason,
        note: note || reason,
      },
      {
        onSuccess: () => {
          toast.success(attendanceUiCopy.timekeeping.createAdjustDialog.toastSuccess);
          onOpenChange(false);
          setEmployeeId('');
          setReason('');
          setNote('');
        },
        onError: (err: any) => {
          toast.error(err?.message || attendanceUiCopy.timekeeping.createAdjustDialog.toastError);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[450px]'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <DialogHeader>
            <DialogTitle>{attendanceUiCopy.timekeeping.createAdjustDialog.title}</DialogTitle>
            <DialogDescription>
              {attendanceUiCopy.timekeeping.createAdjustDialog.description}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='employee'>{attendanceUiCopy.timekeeping.createAdjustDialog.employeeLabel}</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger id='employee'>
                  <SelectValue placeholder={attendanceUiCopy.timekeeping.createAdjustDialog.selectEmployeePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.code || emp.employeeCode || emp.id.slice(0, 8)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='type'>{attendanceUiCopy.timekeeping.createAdjustDialog.eventTypeLabel}</Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger id='type'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='check_in'>{attendanceUiCopy.timekeeping.createAdjustDialog.checkInOption}</SelectItem>
                    <SelectItem value='check_out'>{attendanceUiCopy.timekeeping.createAdjustDialog.checkOutOption}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='flex flex-col gap-2'>
                <Label htmlFor='session'>{attendanceUiCopy.timekeeping.createAdjustDialog.sessionLabel}</Label>
                <div className='text-xs text-muted-foreground pt-2'>{attendanceUiCopy.timekeeping.createAdjustDialog.sessionAuto}</div>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='workDate'>{attendanceUiCopy.timekeeping.createAdjustDialog.workDateLabel}</Label>
                <Input
                  id='workDate'
                  type='date'
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  required
                />
              </div>

              <div className='flex flex-col gap-2'>
                <Label htmlFor='time'>{attendanceUiCopy.timekeeping.createAdjustDialog.timeLabel}</Label>
                <Input
                  id='time'
                  type='time'
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <Label htmlFor='reason'>{attendanceUiCopy.timekeeping.createAdjustDialog.reasonLabel}</Label>
              <Textarea
                id='reason'
                placeholder={attendanceUiCopy.timekeeping.createAdjustDialog.reasonPlaceholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                required
              />
            </div>

            <div className='flex flex-col gap-2'>
              <Label htmlFor='note'>{attendanceUiCopy.timekeeping.createAdjustDialog.noteLabel}</Label>
              <Textarea
                id='note'
                placeholder={attendanceUiCopy.timekeeping.createAdjustDialog.notePlaceholder}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={correctionMutation.isPending}
            >
              {commonUiCopy.cancel}
            </Button>
            <Button type='submit' disabled={correctionMutation.isPending}>
              {correctionMutation.isPending && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
              {commonUiCopy.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
