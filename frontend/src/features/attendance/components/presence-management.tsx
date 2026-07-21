'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  attendanceQueryControllerGetPresence,
  attendanceQueryControllerGetPresenceSummary,
  departmentsControllerFindList,
} from '@/api/generated/endpoints';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { attendanceUiCopy, commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { extractList, unwrapData } from '@/lib/api-extract';
import { isUnauthenticatedError } from '@/lib/error-taxonomy';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/lib/rbac';
import { permissions } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { presenceColumns, type PresenceItem, type PresenceStatus } from './presence-columns';

interface SummaryData {
  active: number;
  break: number;
  upcoming: number;
  absent: number;
  leave: number;
  offDuty: number;
}

const STATUS_TABS: { value: PresenceStatus | 'ALL'; label: string; dotClass?: string }[] = [
  { value: 'ALL', label: employeeUiCopy.attendance.presence.all },
  { value: 'ACTIVE', label: employeeUiCopy.attendance.presence.active, dotClass: 'bg-emerald-500' },
  { value: 'BREAK', label: employeeUiCopy.attendance.presence.break, dotClass: 'bg-amber-500' },
  { value: 'ABSENT', label: employeeUiCopy.attendance.presence.absent, dotClass: 'bg-rose-500' },
  { value: 'UPCOMING', label: employeeUiCopy.attendance.presence.upcoming, dotClass: 'bg-blue-500' },
  { value: 'LEAVE', label: employeeUiCopy.attendance.presence.leave, dotClass: 'bg-purple-500' },
  { value: 'OFF_DUTY', label: employeeUiCopy.attendance.presence.offDuty, dotClass: 'bg-slate-400' },
];

export function PresenceManagement() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const user = useAuthStore((state) => state.user);
  const canViewAll = hasPermission(user, permissions.attendance.viewAll);

  const [departmentId, setDepartmentId] = React.useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = React.useState<PresenceStatus | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 50 });

  const cleanDeptId = departmentId === 'ALL' ? undefined : departmentId;
  const cleanStatus = selectedStatus ?? undefined;

  // Fetch departments
  const { data: deptData } = useQuery({
    queryKey: ['/departments/list'],
    queryFn: () => departmentsControllerFindList(),
  });
  const departments = React.useMemo(() => extractList<{ id: string; name: string }>(deptData), [deptData]);

  // Fetch presence summary
  const { data: summaryResponse } = useQuery({
    queryKey: ['/api/v1/attendances/presence/summary', cleanDeptId],
    queryFn: () =>
      attendanceQueryControllerGetPresenceSummary({ departmentId: cleanDeptId }),
  });
  const summary: SummaryData = unwrapData<any>(summaryResponse) ?? {
    active: 0, break: 0, upcoming: 0, absent: 0, leave: 0, offDuty: 0,
  };

  // Fetch presence list
  const { data: listResponse, error, isLoading, refetch } = useQuery({
    queryKey: ['/api/v1/attendances/presence', cleanDeptId, cleanStatus],
    queryFn: () =>
      attendanceQueryControllerGetPresence({ departmentId: cleanDeptId, status: cleanStatus }),
  });
  const rawItems = extractList<any>(listResponse);

  // ponytail: server-side search when dataset exceeds 500 items / pagination is added
  const items: PresenceItem[] = React.useMemo(() => {
    return rawItems
      .filter(
        (item: any) =>
          !searchQuery ||
          item.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .map((item: any) => ({
        id: item.employeeId ?? '',
        employeeCode: item.employeeCode ?? '',
        fullName: item.fullName ?? '',
        departmentName: item.departmentName ?? null,
        position: item.position ?? null,
        status: (item.status ?? 'OFF_DUTY') as PresenceStatus,
        checkInAt: item.checkInAt ?? null,
        workingDurationSeconds: item.workingDurationSeconds ?? 0,
        shiftName: item.shiftName ?? null,
      }));
  }, [rawItems, searchQuery]);

  const isAuthError = isUnauthenticatedError(error as any);

  React.useEffect(() => {
    if (!isAuthError) return;
    router.replace('/auth/sign-in');
  }, [isAuthError, router]);

  const totalCount =
    summary.active + summary.break + summary.upcoming + summary.absent + summary.leave + summary.offDuty;

  const handleResetFilters = () => {
    setDepartmentId('ALL');
    setSelectedStatus(null);
    setSearchQuery('');
  };

  // Build department options for faceted filter
  const departmentOptions = React.useMemo(
    () =>
      departments.map((dept: { id: string; name: string }) => ({
        label: dept.name,
        value: dept.name,
      })),
    [departments],
  );

  const cols: ColumnDef<PresenceItem>[] = React.useMemo(() => {
    return presenceColumns.map((column) => {
      if (column.id !== 'departmentName') return column as ColumnDef<PresenceItem>;
      return { ...column, meta: { ...column.meta, options: departmentOptions } } as ColumnDef<PresenceItem>;
    });
  }, [departmentOptions]);

  const table = useReactTable({
    data: items,
    columns: cols,
    state: { sorting, columnVisibility, pagination },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    pageCount: Math.ceil(items.length / pagination.pageSize) || 1,
  });

  if (isAuthError) {
    return (
      <div className='text-muted-foreground flex min-h-64 items-center justify-center text-sm'>
        {commonUiCopy.sessionExpiredRedirecting}
      </div>
    );
  }

  if (error && !isAuthError) {
    return (
      <QueryErrorAlert
        error={error as Error}
        subject={attendanceUiCopy.subject}
        onRetry={() => void refetch()}
        className='rounded-2xl border-destructive/50 bg-destructive/5'
      />
    );
  }

  const activeTab = selectedStatus ?? 'ALL';
  const hasFilters = searchQuery !== '' || departmentId !== 'ALL' || selectedStatus !== null;

  const emptyState = !items.length ? (
    <div className='flex flex-col items-center gap-1 py-6'>
      <p className='text-muted-foreground text-sm'>
        {hasFilters ? attendanceUiCopy.emptyFiltered : attendanceUiCopy.empty}
      </p>
      {hasFilters && (
        <button type='button' className='text-primary underline-offset-2 hover:underline' onClick={handleResetFilters}>
          {commonUiCopy.clearFilters}
        </button>
      )}
    </div>
  ) : undefined;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ willChange: 'transform, opacity' }}
      className='flex flex-1 flex-col gap-4'
    >
      {/* Status tabs */}
      <div className='flex items-center justify-between gap-4'>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setSelectedStatus(value === 'ALL' ? null : (value as PresenceStatus))}
          className='flex flex-1'
        >
          <TabsList className='w-fit'>
            {STATUS_TABS.map((tab) => {
              const count =
                tab.value === 'ALL'
                  ? totalCount
                  : summary[tab.value.toLowerCase() as keyof SummaryData] ?? 0;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className='flex items-center gap-1.5'>
                  {tab.dotClass && <span className={cn('h-2 w-2 rounded-full', tab.dotClass)} />}
                  {tab.label} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* DataTable with client-side sort */}
      <div className='flex flex-1 flex-col gap-2'>
        <DataTable table={table} emptyState={emptyState} isLoading={isLoading} animationKey={activeTab}>
          <DataTableToolbar table={table}>
            <select
              className='h-8 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value='ALL'>{employeeUiCopy.attendance.presence.allDepartments}</option>
              {departments.map((dept: { id: string; name: string }) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </DataTableToolbar>
        </DataTable>
      </div>
    </motion.div>
  );
}
