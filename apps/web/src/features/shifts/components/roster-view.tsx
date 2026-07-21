'use client';

import * as React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addDays, startOfWeek, format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { appCopy, commonUiCopy, shiftUiCopy, scheduleUiCopy } from '@/lib/app-copy';
import { feedbackCopy } from '@/lib/feedback-copy';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { cn } from '@/lib/utils';
import { useDepartmentsQuery, employeesQueryOptions } from '@/features/employees';
import {
  approveShiftRosterMutation,
  publishShiftRosterMutation,
  rejectShiftRosterMutation,
  submitShiftRosterMutation,
  createShiftAssignmentMutation,
  cancelShiftAssignmentMutation
} from '../api/mutations';
import {
  shiftsRosterQueryOptions,
  shiftsTemplatesQueryOptions,
  type ShiftRosterStatus,
  type ShiftRosterRow
} from '../api/queries';
import { formatDate } from '@/lib/format';
import { positionsControllerFindAll, locationsControllerFindList } from '@/api/generated/endpoints';
import { extractList } from '@/lib/api-extract';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: scheduleUiCopy.roster.monday,
  tuesday: scheduleUiCopy.roster.tuesday,
  wednesday: scheduleUiCopy.roster.wednesday,
  thursday: scheduleUiCopy.roster.thursday,
  friday: scheduleUiCopy.roster.friday,
  saturday: scheduleUiCopy.roster.saturday,
  sunday: scheduleUiCopy.roster.sunday,
};

function toIsoDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

function getWeekRange(date: Date) {
  const mon = startOfWeek(date, { weekStartsOn: 1 });
  return {
    from: toIsoDate(mon),
    to: toIsoDate(addDays(mon, 6)),
    days: DAYS.map((_, i) => addDays(mon, i))
  };
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return scheduleUiCopy.roster.hoursFormat(hours, remainder);
}

function getStatusLabel(status: ShiftRosterStatus) {
  switch (status) {
    case 'pending_approval':
      return shiftUiCopy.roster.status.pendingApproval;
    case 'approved':
      return shiftUiCopy.roster.status.approved;
    case 'rejected':
      return shiftUiCopy.roster.status.rejected;
    case 'published_locked':
      return shiftUiCopy.roster.status.publishedLocked;
    default:
      return shiftUiCopy.roster.status.draft;
  }
}

function getStatusVariant(status: ShiftRosterStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
    case 'published_locked':
      return 'default';
    case 'rejected':
      return 'destructive';
    case 'pending_approval':
      return 'outline';
    default:
      return 'secondary';
  }
}

function getWorkflowMessage(status: ShiftRosterStatus) {
  switch (status) {
    case 'pending_approval':
      return shiftUiCopy.roster.workflow.pendingApproval;
    case 'approved':
      return shiftUiCopy.roster.workflow.approved;
    case 'published_locked':
      return shiftUiCopy.roster.workflow.publishedLocked;
    case 'rejected':
      return shiftUiCopy.roster.workflow.rejected;
    default:
      return shiftUiCopy.roster.workflow.draft;
  }
}

function formatMeta(value?: string | null) {
  return value ? formatDate(value) : '—';
}

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D');
}

const positionKeys = createKeyFactory('positions');
function positionsQueryOptions() {
  return {
    queryKey: positionKeys.all(),
    queryFn: () => positionsControllerFindAll().then((r) => extractList<{ id: string; name: string; isActive: boolean }>(r)),
    ...queryPolicyPresets['default']
  };
}

function getInitials(name: string) {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function RosterView() {
  const [weekStart, setWeekStart] = React.useState(() => {
    const now = new Date();
    return startOfWeek(now, { weekStartsOn: 1 });
  });

  const [filters, setFilters] = React.useState(() => ({
    employeeId: '',
    departmentId: ''
  }));

  const [rejectReason, setRejectReason] = React.useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [employeePopoverOpen, setEmployeePopoverOpen] = React.useState(false);
  const [employeeSearch, setEmployeeSearch] = React.useState('');

  const [assignSheetOpen, setAssignSheetOpen] = React.useState(false);
  const [assignTarget, setAssignTarget] = React.useState<{ employeeId: string; date: string } | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<{ id: string; date: string } | null>(null);

  const [selectedTemplate, setSelectedTemplate] = React.useState('');
  const [selectedLocation, setSelectedLocation] = React.useState('');
  const [selectedPosition, setSelectedPosition] = React.useState('');

  const departmentsQuery = useDepartmentsQuery();
  const employeesQuery = useQuery(employeesQueryOptions({ limit: 500 }));
  const templatesQuery = useQuery(shiftsTemplatesQueryOptions({ page: 1, limit: 100 }));
  const positionsQuery = useQuery(positionsQueryOptions());
  const locationsQuery = useQuery({
    queryKey: ['locations-list'],
    queryFn: async () => {
      const res = await locationsControllerFindList({});
      return extractList<{ id: string; code: string; name: string }>(res);
    }
  });

  const weekRange = getWeekRange(weekStart);

  const employeeOptions = React.useMemo(
    () =>
      (employeesQuery.data?.employees ?? []).map((emp) => ({
        value: emp.id,
        label: `${emp.firstName} ${emp.lastName}${emp.employeeCode ? ` (${emp.employeeCode})` : ''}`.trim(),
        departmentId: emp.department?.id
      })),
    [employeesQuery.data?.employees]
  );

  const filteredEmployeesOptions = React.useMemo(() => {
    let opts = employeeOptions;
    if (filters.departmentId) {
      opts = opts.filter((opt) => opt.departmentId === filters.departmentId);
    }
    if (!employeeSearch) return opts;
    const term = normalize(employeeSearch);
    return opts.filter((opt) => normalize(opt.label).includes(term));
  }, [employeeOptions, employeeSearch, filters.departmentId]);

  const rosterQuery = useQuery(
    shiftsRosterQueryOptions({
      from: weekRange.from,
      to: weekRange.to,
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {})
    })
  );

  const employees = employeesQuery.data?.employees ?? [];
  const templates = templatesQuery.data?.templates ?? [];
  const positions = positionsQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const rosterRows = rosterQuery.data?.rows ?? [];
  const publication = rosterQuery.data?.publication;
  const status = publication?.status ?? 'draft';
  const isLocked = status === 'pending_approval' || status === 'approved' || status === 'published_locked';

  const isLoading =
    rosterQuery.isLoading ||
    employeesQuery.isLoading ||
    templatesQuery.isLoading ||
    locationsQuery.isLoading ||
    positionsQuery.isLoading;

  const displayedEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      if (filters.employeeId && emp.id !== filters.employeeId) return false;
      if (filters.departmentId && emp.department?.id !== filters.departmentId) return false;
      return true;
    });
  }, [employees, filters.employeeId, filters.departmentId]);

  const assignmentsByDay = React.useMemo(() => {
    const map = new Map<string, Map<string, ShiftRosterRow[]>>();
    for (const row of rosterRows) {
      if (!map.has(row.employeeId)) map.set(row.employeeId, new Map());
      const dayMap = map.get(row.employeeId)!;
      if (!dayMap.has(row.workDate)) dayMap.set(row.workDate, []);
      dayMap.get(row.workDate)!.push(row);
    }
    return map;
  }, [rosterRows]);

  const coverage = React.useMemo(() => {
    const map = new Map<string, { assigned: number; location: string; position: string }>();
    for (const row of rosterRows) {
      const loc = row.locationName || 'Không có địa điểm';
      const pos = row.positionName || 'Không có vị trí';
      const key = `${loc}|${pos}`;
      const current = map.get(key) ?? { assigned: 0, location: loc, position: pos };
      current.assigned += 1;
      map.set(key, current);
    }
    return Array.from(map.entries()).map(([key, data]) => ({ key, ...data }));
  }, [rosterRows]);

  const weeklyHours = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rosterRows) {
      map.set(row.employeeName, (map.get(row.employeeName) ?? 0) + (row.scheduledMinutes ?? 0));
    }
    return map;
  }, [rosterRows]);

  const availablePositionsForTemplate = React.useMemo(() => {
    if (!selectedTemplate) return [];
    return positions.filter((p) => p.isActive);
  }, [selectedTemplate, positions]);

  const submitMutation = useMutation({
    ...submitShiftRosterMutation,
    onSuccess: () => {
      notifyMutationSuccess(feedbackCopy.success.rosterSubmitted);
    },
    onError: (error) => {
      notifyMutationError(error, feedbackCopy.failure.submitRoster);
    }
  });

  const approveMutation = useMutation({
    ...approveShiftRosterMutation,
    onSuccess: () => {
      notifyMutationSuccess(feedbackCopy.success.rosterApproved);
    },
    onError: (error) => {
      notifyMutationError(error, feedbackCopy.failure.approveRoster);
    }
  });

  const rejectMutation = useMutation({
    ...rejectShiftRosterMutation,
    onSuccess: () => {
      notifyMutationSuccess(feedbackCopy.success.rosterRejected);
      setRejectReason('');
      setRejectDialogOpen(false);
    },
    onError: (error) => {
      notifyMutationError(error, feedbackCopy.failure.rejectRoster);
    }
  });

  const publishMutation = useMutation({
    ...publishShiftRosterMutation,
    onSuccess: () => {
      notifyMutationSuccess(feedbackCopy.success.rosterPublishedLocked);
    },
    onError: (error) => {
      notifyMutationError(error, feedbackCopy.failure.publishRoster);
    }
  });

  const assignMutation = useMutation({
    ...createShiftAssignmentMutation,
    onSuccess: () => {
      notifyMutationSuccess('Gán ca làm việc thành công.');
      setAssignSheetOpen(false);
      setAssignTarget(null);
      setSelectedTemplate('');
      setSelectedLocation('');
      setSelectedPosition('');
    },
    onError: (error) => {
      notifyMutationError(error, 'Không thể gán ca làm việc.');
    }
  });

  const cancelMutation = useMutation({
    ...cancelShiftAssignmentMutation,
    onSuccess: () => {
      notifyMutationSuccess('Đã hủy ca làm việc thành công.');
      setCancelTarget(null);
    },
    onError: (error) => {
      notifyMutationError(error, 'Không thể hủy ca làm việc.');
    }
  });

  const isMutating =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    publishMutation.isPending ||
    assignMutation.isPending ||
    cancelMutation.isPending;

  const workflowPayload = React.useMemo(
    () => ({
      from: weekRange.from,
      to: weekRange.to,
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {})
    }),
    [filters.departmentId, weekRange.from, weekRange.to]
  );

  if (rosterQuery.error) {
    return (
      <QueryErrorAlert
        error={rosterQuery.error as Error & { digest?: string }}
        subject={shiftUiCopy.roster.subject}
        onRetry={() => void rosterQuery.refetch()}
        className='rounded-xl border-destructive/50 bg-destructive/5'
      />
    );
  }

  if (isLoading || !rosterQuery.data) {
    return <RosterGridSkeleton />;
  }

  function handleSubmit() {
    void submitMutation.mutate(workflowPayload);
  }

  function handleApprove() {
    void approveMutation.mutate(workflowPayload);
  }

  function handleReject() {
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error(feedbackCopy.warning.rejectReasonRequired);
      return;
    }
    void rejectMutation.mutate({
      ...workflowPayload,
      reason
    });
  }

  function handlePublish() {
    void publishMutation.mutate(workflowPayload);
  }

  function handleCellClick(employeeId: string, dateStr: string) {
    if (isLocked) return;
    setAssignTarget({ employeeId, date: dateStr });
    setAssignSheetOpen(true);
  }

  function handleCancelClick(id: string, dateStr: string) {
    setCancelTarget({ id, date: dateStr });
  }

  function handleCancelConfirm() {
    if (!cancelTarget) return;
    void cancelMutation.mutate({
      id: cancelTarget.id,
      payload: {
        cancelFrom: cancelTarget.date,
        reason: 'Hủy trực tiếp từ bảng lịch tuần'
      }
    });
  }

  function handleAssignSubmit() {
    if (!assignTarget || !selectedTemplate || !selectedLocation || !selectedPosition) return;
    void assignMutation.mutate({
      employeeId: assignTarget.employeeId,
      shiftTemplateId: selectedTemplate,
      locationId: selectedLocation,
      positionId: selectedPosition,
      effectiveFrom: assignTarget.date,
      effectiveTo: assignTarget.date,
      status: 'planned'
    });
  }

  function handleWeekPrev() {
    setWeekStart((prev) => addDays(prev, -7));
  }

  function handleWeekNext() {
    setWeekStart((prev) => addDays(prev, 7));
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      {/* 1. Header Filters Section */}
      <div className='flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
          <div className='flex items-center gap-2 text-sm'>
            <Button variant='outline' size='icon' className='h-9 w-9 rounded-md' onClick={handleWeekPrev}>
              <Icons.chevronLeft className='h-4 w-4' />
            </Button>
            <span className='text-sm font-semibold min-w-[200px] text-center bg-muted/30 py-1.5 px-3 rounded-md border border-border/50'>
              {format(weekStart, 'dd/MM/yyyy')} - {format(addDays(weekStart, 6), 'dd/MM/yyyy')}
            </span>
            <Button variant='outline' size='icon' className='h-9 w-9 rounded-md' onClick={handleWeekNext}>
              <Icons.chevronRight className='h-4 w-4' />
            </Button>
          </div>

          <div className='flex flex-col gap-1 text-sm'>
            <Select
              value={filters.departmentId}
              onValueChange={(value) =>
                setFilters((current) => ({ ...current, departmentId: value === '__all__' ? '' : value, employeeId: '' }))
              }
            >
              <SelectTrigger className='rounded-md h-9'>
                <SelectValue placeholder={shiftUiCopy.roster.allDepartments} />
              </SelectTrigger>
              <SelectContent className='rounded-md'>
                <SelectItem value='__all__'>{shiftUiCopy.roster.allDepartments}</SelectItem>
                {(departmentsQuery.data ?? []).map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-col gap-1 text-sm'>
            <Popover open={employeePopoverOpen} onOpenChange={(next) => { setEmployeePopoverOpen(next); if (!next) setEmployeeSearch(''); }}>
              <PopoverTrigger asChild>
                <Button variant='outline' role='combobox' aria-expanded={employeePopoverOpen} className='w-full justify-between font-normal rounded-md h-9'>
                  {employeeOptions.find((o) => o.value === filters.employeeId)?.label ??
                    shiftUiCopy.roster.allEmployees}
                  <Icons.chevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-[--radix-popover-trigger-width] p-0 rounded-md shadow-lg'>
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={commonUiCopy.searchByName}
                    value={employeeSearch}
                    onValueChange={setEmployeeSearch}
                    className='h-9 border-none'
                  />
                  <CommandList className='max-h-60'>
                    <CommandEmpty>{commonUiCopy.noEmployeesFound}</CommandEmpty>
                    <CommandGroup>
                      {!employeeSearch && (
                        <CommandItem
                          value='__all__'
                          onSelect={() => {
                            setFilters((current) => ({ ...current, employeeId: '' }));
                            setEmployeePopoverOpen(false);
                            setEmployeeSearch('');
                          }}
                          className='text-xs'
                        >
                          <Icons.check className={cn('mr-2 h-4 w-4', !filters.employeeId ? 'opacity-100' : 'opacity-0')} />
                          {shiftUiCopy.roster.allEmployees}
                        </CommandItem>
                      )}
                      {filteredEmployeesOptions.map((opt) => (
                        <CommandItem
                          key={opt.value}
                          value={opt.value}
                          onSelect={() => {
                            setFilters((current) => ({ ...current, employeeId: opt.value }));
                            setEmployeePopoverOpen(false);
                            setEmployeeSearch('');
                          }}
                          className='text-xs'
                        >
                          <Icons.check className={cn('mr-2 h-4 w-4', filters.employeeId === opt.value ? 'opacity-100' : 'opacity-0')} />
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

        {/* 2. Status Badge and Flow Action buttons */}
        <div className='flex flex-wrap items-center justify-between gap-4 border-t pt-3 border-border/50'>
          <div className='flex flex-wrap items-center gap-3'>
            <Badge variant={getStatusVariant(status)} className='rounded-md px-2.5 py-0.5 text-xs font-semibold'>
              {getStatusLabel(status)}
            </Badge>
            {publication?.publishedAt ? (
              <span className='text-muted-foreground text-xs'>
                {shiftUiCopy.roster.meta.publishedAtLabel}: {formatDate(publication.publishedAt)}
              </span>
            ) : null}
          </div>

          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='rounded-md h-8 text-xs'
              onClick={() => void rosterQuery.refetch()}
              disabled={rosterQuery.isFetching}
            >
              <Icons.refresh className={cn('mr-1.5 h-3.5 w-3.5', rosterQuery.isFetching && 'animate-spin')} />
              {shiftUiCopy.roster.refreshAction}
            </Button>

            {(status === 'draft' || status === 'rejected') ? (
              <Button type='button' size='sm' className='rounded-md h-8 text-xs font-semibold' onClick={handleSubmit} disabled={isMutating}>
                <Icons.check className='mr-1.5 h-3.5 w-3.5' />
                {shiftUiCopy.roster.submitAction}
              </Button>
            ) : null}

            {status === 'pending_approval' ? (
              <>
                <Button type='button' size='sm' className='rounded-md h-8 text-xs font-semibold' onClick={handleApprove} disabled={isMutating}>
                  <Icons.check className='mr-1.5 h-3.5 w-3.5' />
                  {shiftUiCopy.roster.approveAction}
                </Button>
                <Button type='button' size='sm' variant='destructive' className='rounded-md h-8 text-xs font-semibold' onClick={() => setRejectDialogOpen(true)} disabled={isMutating}>
                  <Icons.circleX className='mr-1.5 h-3.5 w-3.5' />
                  {shiftUiCopy.roster.rejectAction}
                </Button>
              </>
            ) : null}

            {status === 'approved' ? (
              <Button type='button' size='sm' className='rounded-md h-8 text-xs font-semibold' onClick={handlePublish} disabled={isMutating}>
                <Icons.check className='mr-1.5 h-3.5 w-3.5' />
                {shiftUiCopy.roster.publishAction}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* 3. Workspace Columns (Weekly Grid + Sidebar cards) */}
      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'>
        <div className='flex flex-col gap-4'>
          {status === 'rejected' && publication?.rejectionReason && (
            <Alert variant='destructive' className='rounded-xl border border-destructive/50 bg-destructive/5 p-4'>
              <AlertTitle className='font-semibold text-sm flex items-center gap-1.5'>
                <Icons.warning className='h-4 w-4' />
                {shiftUiCopy.roster.meta.rejectReasonLabel}
              </AlertTitle>
              <AlertDescription className='text-xs mt-1'>{publication.rejectionReason}</AlertDescription>
            </Alert>
          )}

          {isLocked ? (
            <Alert className='rounded-xl border border-border bg-muted/20 p-4'>
              <AlertTitle className='font-semibold text-sm flex items-center gap-1.5'>
                <Icons.lock className='h-4 w-4' />
                {shiftUiCopy.roster.lockedTitle}
              </AlertTitle>
              <AlertDescription className='text-xs mt-1'>{getWorkflowMessage(status)}</AlertDescription>
            </Alert>
          ) : null}

          {displayedEmployees.length === 0 ? (
            <div className='text-muted-foreground rounded-xl border border-dashed border-border p-8 text-center text-sm bg-muted/10'>
              <Icons.calendar className='mx-auto h-8 w-8 opacity-40 mb-2' />
              {scheduleUiCopy.roster.empty}
            </div>
          ) : (
              <div className='rounded-xl border border-border bg-card shadow-sm overflow-hidden overflow-x-auto'>
                <Table className='border-collapse'>
                  <TableHeader>
                    <TableRow className='hover:bg-transparent bg-muted/20'>
                      <TableHead className='sticky left-0 bg-card min-w-[160px] max-w-[200px] z-20 border-r border-border font-semibold text-xs text-foreground uppercase tracking-wider py-3 px-4'>
                        {scheduleUiCopy.roster.employeeColumn}
                      </TableHead>
                      {weekRange.days.map((day, i) => (
                        <TableHead key={i} className='min-w-[120px] text-center border-r border-border font-semibold text-xs text-foreground uppercase tracking-wider py-3 px-3'>
                          {DAY_LABELS[DAYS[i]]}
                          <span className='block text-[10px] font-normal text-muted-foreground mt-0.5'>{format(day, 'dd/MM')}</span>
                        </TableHead>
                      ))}
                      <TableHead className='min-w-[90px] text-center font-semibold text-xs text-foreground uppercase tracking-wider py-3 px-3'>
                        {scheduleUiCopy.roster.weekHoursTitle}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedEmployees.map((emp) => {
                      const empHoursMins = weeklyHours.get(`${emp.firstName} ${emp.lastName}`.trim()) ?? 0;
                      return (
                        <TableRow key={emp.id} className='hover:bg-muted/5'>
                          <TableCell className='sticky left-0 bg-card font-medium z-10 border-r border-b border-border py-3 px-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]'>
                            <div className='flex items-center gap-2.5'>
                              <Avatar className='h-7 w-7 border shrink-0'>
                                <AvatarFallback className='text-[10px] bg-primary/5 text-primary font-semibold'>
                                  {getInitials(`${emp.firstName} ${emp.lastName}`)}
                                </AvatarFallback>
                              </Avatar>
                              <div className='flex flex-col min-w-0'>
                                <span className='truncate text-xs font-semibold leading-normal text-foreground'>
                                  {emp.firstName} {emp.lastName}
                                </span>
                                <span className='text-[9px] text-muted-foreground font-mono mt-0.5'>
                                  {emp.employeeCode || emp.id.slice(0, 8)}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          {weekRange.days.map((day, i) => {
                            const dateStr = toIsoDate(day);
                            const dayRows = assignmentsByDay.get(emp.id)?.get(dateStr) ?? [];
                            return (
                              <TableCell
                                key={i}
                                className={cn(
                                  'text-center border-r border-b border-border py-2 px-2.5 min-w-[120px] transition-colors',
                                  !isLocked && 'cursor-pointer hover:bg-muted/20'
                                )}
                                onClick={() => handleCellClick(emp.id, dateStr)}
                              >
                                {dayRows.length > 0 ? (
                                  <div className='flex flex-col gap-1' onClick={(e) => e.stopPropagation()}>
                                    {dayRows.map((r) => (
                                      <Badge
                                        key={r.assignmentId}
                                        variant='outline'
                                        className={cn(
                                          'relative group flex items-center justify-between gap-1 text-[11px] font-normal leading-tight rounded-md py-1.5 px-2 bg-muted/30 border border-border/80 w-full transition-all hover:border-border-hover shadow-xs',
                                          r.assignmentStatus !== 'published' && 'border-dashed opacity-85'
                                        )}
                                      >
                                        <div className='flex flex-col text-left min-w-0'>
                                          <span className='font-semibold text-foreground truncate'>{r.shiftTemplateName}</span>
                                          <span className='text-[9px] text-muted-foreground font-mono mt-0.5'>{r.startTime}-{r.endTime}</span>
                                        </div>
                                        {!isLocked && (
                                          <Button
                                            type='button'
                                            variant='ghost'
                                            size='icon'
                                            className='opacity-0 group-hover:opacity-100 h-4.5 w-4.5 p-0 hover:bg-destructive/10 hover:text-destructive shrink-0 transition-opacity rounded-sm'
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCancelClick(r.assignmentId, r.workDate);
                                            }}
                                          >
                                            <Icons.trash className='h-3 w-3' />
                                          </Button>
                                        )}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className='text-muted-foreground/40 text-[11px] font-mono'>
                                    {scheduleUiCopy.roster.noAssignment}
                                  </span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className='text-center border-b border-border font-semibold text-xs py-3 px-3 text-foreground font-mono bg-muted/5'>
                            {formatMinutes(empHoursMins)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )
          }
        </div>

        {/* 4. Sidebars Stack */}
        <div className='flex flex-col gap-4 shrink-0'>
          {/* Card 1: Workflow info and version details */}
          <div className='rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-3'>
            <div>
              <h3 className='text-xs font-semibold uppercase tracking-wider text-foreground'>{appCopy.roster.workflowTitle}</h3>
              <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>{getWorkflowMessage(status)}</p>
            </div>
            <div className='grid gap-2 text-xs border-t pt-3 border-border/50'>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-muted-foreground'>{shiftUiCopy.roster.meta.statusLabel}</span>
                <Badge variant={getStatusVariant(status)} className='rounded-md px-1.5 py-0.2'>{getStatusLabel(status)}</Badge>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-muted-foreground'>{shiftUiCopy.roster.meta.submittedAtLabel}</span>
                <span className='font-medium'>{formatMeta(publication?.submittedAt)}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-muted-foreground'>{shiftUiCopy.roster.meta.approvedAtLabel}</span>
                <span className='font-medium'>{formatMeta(publication?.approvedAt)}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-muted-foreground'>{shiftUiCopy.roster.meta.publishedAtLabel}</span>
                <span className='font-medium'>{formatMeta(publication?.publishedAt)}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-muted-foreground'>{shiftUiCopy.roster.meta.lockedAtLabel}</span>
                <span className='font-medium'>{formatMeta(publication?.lockedAt)}</span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-muted-foreground'>{appCopy.roster.version}</span>
                <span className='font-mono font-semibold'>{publication?.version ?? 1}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Coverage constraints summary */}
          <div className='rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-3'>
            <h3 className='text-xs font-semibold uppercase tracking-wider text-foreground'>{scheduleUiCopy.roster.coverageTitle}</h3>
            {coverage.length === 0 ? (
              <p className='text-muted-foreground text-xs italic'>{commonUiCopy.noResults}</p>
            ) : (
              <div className='space-y-2 border-t pt-2 border-border/50 max-h-56 overflow-y-auto pr-1'>
                {coverage.map((c) => (
                  <div key={c.key} className='flex items-center justify-between gap-2 text-xs py-0.5'>
                    <div className='flex flex-col min-w-0'>
                      <span className='font-medium text-foreground truncate text-[11px]'>{c.location}</span>
                      <span className='text-[10px] text-muted-foreground truncate'>{c.position}</span>
                    </div>
                    <Badge variant={c.assigned === 0 ? 'destructive' : 'outline'} className='shrink-0 text-[10px] rounded-md font-mono'>
                      {shiftUiCopy.roster.meta.paxCount(c.assigned)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Weekly summary of hours per employee */}
          <div className='rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-3'>
            <h3 className='text-xs font-semibold uppercase tracking-wider text-foreground'>{scheduleUiCopy.roster.weekHoursTitle}</h3>
            {weeklyHours.size === 0 ? (
              <p className='text-muted-foreground text-xs italic'>{commonUiCopy.noResults}</p>
            ) : (
              <div className='space-y-2 border-t pt-2 border-border/50 max-h-56 overflow-y-auto pr-1'>
                {Array.from(weeklyHours.entries()).map(([name, mins]) => (
                  <div key={name} className='flex items-center justify-between text-xs py-0.5'>
                    <span className='text-muted-foreground truncate text-[11px]'>{name}</span>
                    <span className='font-semibold text-foreground font-mono text-[11px]'>{formatMinutes(mins)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Assignment Sheet modal drawer */}
      <Sheet open={assignSheetOpen} onOpenChange={(o) => { if (!o) { setAssignSheetOpen(false); setAssignTarget(null); } }}>
        <SheetContent className='flex flex-col sm:max-w-md rounded-l-lg border-l shadow-2xl p-6'>
          <SheetHeader className='flex flex-row items-start justify-between border-b pb-4 space-y-0'>
            <div>
              <SheetTitle className='text-lg font-bold text-foreground'>{scheduleUiCopy.roster.assignShift}</SheetTitle>
              <SheetDescription className='text-xs text-muted-foreground'>
                {assignTarget ? `Phân ca cho ngày ${formatDate(assignTarget.date)}` : ''}
              </SheetDescription>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <Button variant='outline' className='rounded-md h-9 text-xs' onClick={() => setAssignSheetOpen(false)}>
                {commonUiCopy.cancel}
              </Button>
              <Button
                className='rounded-md h-9 text-xs font-semibold'
                size='sm'
                onClick={handleAssignSubmit}
                disabled={!selectedTemplate || !selectedLocation || !selectedPosition || assignMutation.isPending}
              >
                {assignMutation.isPending ? (
                  <Icons.spinner className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                ) : (
                  <Icons.check className='mr-1.5 h-3.5 w-3.5' />
                )}
                {scheduleUiCopy.roster.assignShift}
              </Button>
            </div>
          </SheetHeader>
          <div className='space-y-4 py-4 flex-1'>
            <div className='flex flex-col gap-1.5 text-sm'>
              <span className='font-semibold text-xs text-foreground'>{shiftUiCopy.assignments.templateLabel}</span>
              <Select value={selectedTemplate} onValueChange={(v) => { setSelectedTemplate(v); setSelectedPosition(''); }}>
                <SelectTrigger className='rounded-md h-9'><SelectValue placeholder={shiftUiCopy.assignments.templatePlaceholder} /></SelectTrigger>
                <SelectContent className='rounded-md'>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id} className='text-xs'>
                      {t.name} ({t.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex flex-col gap-1.5 text-sm'>
              <span className='font-semibold text-xs text-foreground'>Địa điểm</span>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className='rounded-md h-9'><SelectValue placeholder='Chọn địa điểm' /></SelectTrigger>
                <SelectContent className='rounded-md'>
                  {locations.filter((l: any) => l.code?.startsWith('ZONE_')).map((l: any) => (
                    <SelectItem key={l.id} value={l.id} className='text-xs'>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex flex-col gap-1.5 text-sm'>
              <span className='font-semibold text-xs text-foreground'>Vị trí</span>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className='rounded-md h-9'><SelectValue placeholder='Chọn vị trí' /></SelectTrigger>
                <SelectContent className='rounded-md'>
                  {availablePositionsForTemplate.map((p) => (
                    <SelectItem key={p.id} value={p.id} className='text-xs'>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

        </SheetContent>
      </Sheet>

      {/* 6. Rejection Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent className='rounded-lg border shadow-xl max-w-md p-6'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-md font-bold text-foreground'>{shiftUiCopy.roster.rejectAction}</AlertDialogTitle>
            <AlertDialogDescription className='text-xs text-muted-foreground'>
              {shiftUiCopy.roster.meta.rejectDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='py-4'>
            <Input
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder={shiftUiCopy.roster.meta.rejectReasonPlaceholder}
              className='rounded-md h-9 text-xs'
            />
          </div>
          <AlertDialogFooter className='gap-2 sm:gap-0'>
            <AlertDialogCancel className='rounded-md h-9 text-xs' onClick={() => setRejectDialogOpen(false)}>
              {commonUiCopy.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className='rounded-md h-9 text-xs font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              onClick={(e) => {
                e.preventDefault();
                handleReject();
              }}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Icons.spinner className='mr-1.5 h-3.5 w-3.5 animate-spin' />
              ) : (
                <Icons.circleX className='mr-1.5 h-3.5 w-3.5' />
              )}
              Xác nhận từ chối
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 7. Quick Cancel Confirmation Dialog */}
      <AlertDialog open={cancelTarget !== null} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <AlertDialogContent className='rounded-lg border shadow-xl max-w-md p-6'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-md font-bold text-foreground'>{shiftUiCopy.roster.meta.cancelConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription className='text-xs text-muted-foreground'>
              {shiftUiCopy.roster.meta.cancelConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2 sm:gap-0'>
            <AlertDialogCancel className='rounded-md h-9 text-xs'>
              {commonUiCopy.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className='rounded-md h-9 text-xs font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              onClick={handleCancelConfirm}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Icons.spinner className='mr-1.5 h-3.5 w-3.5 animate-spin' />
              ) : (
                <Icons.trash className='mr-1.5 h-3.5 w-3.5' />
              )}
              Đồng ý hủy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function RosterGridSkeleton() {
  return (
    <div className='flex flex-1 flex-col gap-4 animate-pulse'>
      {/* Filters skeleton */}
      <div className='flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
          <div className='flex items-center gap-2'>
            <div className='h-9 w-9 rounded-md bg-muted' />
            <div className='h-9 w-48 rounded-md bg-muted' />
            <div className='h-9 w-9 rounded-md bg-muted' />
          </div>
          <div className='h-9 w-full rounded-md bg-muted' />
          <div className='h-9 w-full rounded-md bg-muted' />
        </div>
        <div className='flex items-center justify-between gap-4 border-t pt-3 border-border/50'>
          <div className='h-6 w-32 rounded bg-muted' />
          <div className='flex items-center gap-2'>
            <div className='h-8 w-24 rounded-md bg-muted' />
            <div className='h-8 w-24 rounded-md bg-muted' />
          </div>
        </div>
      </div>

      {/* Grid workspace skeleton */}
      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'>
        <div className='rounded-xl border border-border bg-card shadow-sm overflow-hidden'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/20 hover:bg-transparent'>
                <TableHead className='min-w-[160px] max-w-[200px] border-r border-border py-3 px-4'>
                  <div className='h-4 w-20 rounded bg-muted' />
                </TableHead>
                {Array.from({ length: 7 }).map((_, i) => (
                  <TableHead key={i} className='min-w-[120px] text-center border-r border-border py-3 px-3'>
                    <div className='h-4 w-12 rounded bg-muted mx-auto' />
                  </TableHead>
                ))}
                <TableHead className='min-w-[90px] text-center py-3 px-3'>
                  <div className='h-4 w-12 rounded bg-muted mx-auto' />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, rIndex) => (
                <TableRow key={rIndex} className='hover:bg-transparent'>
                  <TableCell className='border-r border-b border-border py-3 px-4'>
                    <div className='flex items-center gap-2.5'>
                      <div className='h-7 w-7 rounded-full bg-muted shrink-0' />
                      <div className='space-y-1.5 min-w-0 flex-1'>
                        <div className='h-3 w-24 rounded bg-muted' />
                        <div className='h-2.5 w-16 rounded bg-muted font-mono' />
                      </div>
                    </div>
                  </TableCell>
                  {Array.from({ length: 7 }).map((_, cIndex) => (
                    <TableCell key={cIndex} className='border-r border-b border-border py-2 px-2.5 text-center'>
                      {(rIndex + cIndex) % 2 === 0 ? (
                        <div className='h-9 w-full rounded-md bg-muted/40' />
                      ) : (
                        <div className='h-4 w-6 rounded bg-muted/20 mx-auto' />
                      )}
                    </TableCell>
                  ))}
                  <TableCell className='border-b border-border py-3 px-3 text-center bg-muted/5'>
                    <div className='h-3 w-10 rounded bg-muted mx-auto' />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Sidebar cards skeletons */}
        <div className='flex flex-col gap-4 shrink-0'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-3'>
              <div className='h-4 w-28 rounded bg-muted' />
              <div className='space-y-2 border-t pt-2 border-border/50'>
                <div className='flex justify-between'><div className='h-3 w-16 rounded bg-muted' /><div className='h-3 w-10 rounded bg-muted' /></div>
                <div className='flex justify-between'><div className='h-3 w-20 rounded bg-muted' /><div className='h-3 w-12 rounded bg-muted' /></div>
                <div className='flex justify-between'><div className='h-3 w-14 rounded bg-muted' /><div className='h-3 w-8 rounded bg-muted' /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
