'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { parseAsArrayOf, parseAsString, useQueryStates } from 'nuqs';
import { toast } from 'sonner';
import type { EmployeeResponseDto } from '@/api/generated/model';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDataTable } from '@/hooks/use-data-table';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { isUnauthenticatedError } from '@/lib/error-taxonomy';
import { employeesQueryOptions, type EmployeeFilters } from '../../api/queries';
import Link from 'next/link';
import {
  useBulkChangeStatusMutation,
  useBulkRemoveEmployeesMutation,
  useDepartmentsQuery,
  employeeKeys,
  type BulkChangeStatusVariables,
} from '../../queries/employee-queries';
import { columns } from './columns';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { downloadTableAsCsv } from '@/lib/csv/export-csv';
import { useAuthStore } from '@/stores/auth-store';
import { employeesControllerFindOne } from '@/api/generated/employees-hr-management/employees-hr-management';
import { hasAnyPermission, permissions } from '@/lib/permissions';
import { createTableSearchParams } from '@/lib/pagination';
import { LaborReportExportDialog } from '../dialogs/labor-report-export-dialog';

const EMPLOYEE_STATUS_TABS = [
  {
    value: 'active',
    label: employeeUiCopy.tabs.active,
    icon: Icons.check,
    manageOnly: false
  },
  {
    value: 'official',
    label: employeeUiCopy.tabs.official,
    icon: Icons.user,
    manageOnly: false
  },
  {
    value: 'probation',
    label: employeeUiCopy.tabs.probation,
    icon: Icons.userPen,
    manageOnly: false
  },
  {
    value: 'terminated',
    label: employeeUiCopy.tabs.terminated,
    icon: Icons.employee,
    manageOnly: false
  },
  {
    value: 'deleted',
    label: employeeUiCopy.tabs.deleted,
    icon: Icons.trash,
    manageOnly: true
  }
] as const;

type EmployeeTabValue = (typeof EMPLOYEE_STATUS_TABS)[number]['value'];

const EMPLOYEE_EXPORT_FILENAME = ['nhan', 'vien'].join('-') + '.csv';
const EXPORT_LABEL = 'CSV';

const COLUMN_IDS = ['name','employeeCode','department','username','phoneNumber','position','startDate','endDate','status','updatedAt'] as const;

const BULK_STATUS_OPTIONS: Array<{
  value: BulkChangeStatusVariables['status'];
  label: string;
}> = [
  { value: 'working', label: 'Đang làm việc chính thức (Working)' },
  { value: 'probation', label: 'Đang thử việc (Probation)' },
  { value: 'leave', label: 'Tạm hoãn hợp đồng / Nghỉ dài hạn (Leave)' },
  { value: 'suspended', label: 'Tạm đình chỉ công tác (Suspended)' },
  { value: 'retired', label: 'Nghỉ hưu (Retired)' },
];

function todayString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

function ClearFiltersButton({ disabled }: { disabled?: boolean }) {
  const [, setParams] = useQueryStates({
    ...createTableSearchParams(COLUMN_IDS),
    name: parseAsString,
    departmentIds: parseAsArrayOf(parseAsString, ',')
  });

  return (
    <Button
      type='button'
      variant='link'
      size='sm'
      className='h-auto p-0 text-primary underline-offset-2 hover:underline'
      disabled={disabled}
      onClick={() => {
        void setParams({
          page: 1,
          name: null,
          departmentIds: null,
          sort: []
        });
      }}
    >
      {commonUiCopy.clearFilters}
    </Button>
  );
}

export function EmployeesTable() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = Boolean(
    currentUser?.isSuperAdmin ||
      currentUser?.permissions?.includes('ALL') ||
      currentUser?.permissions?.includes('sys:all'),
  );
  const userPermissions = currentUser?.permissions ?? [];
  const canCreate =
    isSuperAdmin ||
    hasAnyPermission(userPermissions, [
      permissions.employees.create,
      permissions.employees.manage,
    ]);
  const canManage =
    isSuperAdmin ||
    hasAnyPermission(userPermissions, [permissions.employees.manage]);
  const [mounted, setMounted] = React.useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = React.useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] =
    React.useState<BulkChangeStatusVariables['status']>('working');
  const [bulkEffectiveDate, setBulkEffectiveDate] = React.useState<string>(todayString());
  const [bulkReason, setBulkReason] = React.useState<string>('');

  React.useEffect(() => {
    setMounted(true);
  }, []);
  const queryClient = useQueryClient();
  const prefetchEmployeeDetail = React.useCallback(
    (id: string) => {
      const cached = queryClient.getQueryData(employeeKeys.detail(id));
      if (!cached) {
        void queryClient.prefetchQuery({
          queryKey: employeeKeys.detail(id),
          queryFn: ({ signal }) => employeesControllerFindOne(id, {}, { signal }),
          staleTime: 60_000
        });
      }
    },
    [queryClient]
  );
  const [params, setParams] = useQueryStates({
    ...createTableSearchParams(COLUMN_IDS),
    name: parseAsString,
    departmentIds: parseAsArrayOf(parseAsString, ','),
    detail: parseAsString,
    status: parseAsString,
  });

  const activeStatus = params.status ?? 'active';
  const visibleStatusTabs = React.useMemo(
    () => EMPLOYEE_STATUS_TABS.filter((item) => !item.manageOnly || canManage),
    [canManage]
  );
  const resolvedActiveStatus: EmployeeTabValue =
    visibleStatusTabs.some((item) => item.value === activeStatus)
      ? (activeStatus as EmployeeTabValue)
      : 'active';
  const resolvedTab: EmployeeFilters['tab'] = resolvedActiveStatus;

  const filters: EmployeeFilters = {
    page: params.page,
    limit: params.perPage,
    ...(params.name && { search: params.name }),
    ...(resolvedTab && { tab: resolvedTab }),
    ...(params.departmentIds?.length ? { departmentIds: params.departmentIds } : {}),
    ...(params.sort.length > 0 && { sort: JSON.stringify(params.sort) })
  };

  const { data, error, isLoading, refetch } = useQuery(employeesQueryOptions(filters));
  const departmentsQuery = useDepartmentsQuery();
  const isAuthError = isUnauthenticatedError(error);

  React.useEffect(() => {
    if (!isAuthError) return;
    router.replace('/auth/sign-in');
  }, [isAuthError, router]);

  const employees = data?.employees ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.totalEmployees ?? 0) / params.perPage));
  const hasFilters = Boolean(params.name ?? params.departmentIds ?? (resolvedTab !== 'active' ? true : false));

  const handleRowClick = React.useCallback((employee: EmployeeResponseDto) => {
    router.push(`/employees/${employee.id}`);
  }, [router]);

  const departmentOptions = React.useMemo(
    () =>
      (departmentsQuery.data ?? []).map((department) => ({
        label: department.name,
        value: department.id
      })),
    [departmentsQuery.data]
  );

  const cols = React.useMemo(() => {
    return columns(handleRowClick).map((column) => {
      if (column.id !== 'department') return column;
      return {
        ...column,
        meta: {
          ...column.meta,
          options: departmentOptions
        },
        id: 'departmentIds'
      };
    });
  }, [departmentOptions, handleRowClick]);

  const { table } = useDataTable({
    data: employees,
    columns: cols,
    pageCount,
    shallow: true,
    debounceMs: 500,
    tableId: 'employees',
    columnResizeMode: 'onChange'
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map((row) => row.original.id);

  const bulkStatusMut = useBulkChangeStatusMutation(queryClient, {
    onSuccess: (res) => {
      toast.success(
        `Đã chuyển trạng thái thành công ${res.succeeded}/${res.total} nhân viên.`
      );
      table.resetRowSelection();
      setBulkStatusOpen(false);
      setBulkReason('');
    },
    onError: () => {
      toast.error('Không thể thực hiện chuyển trạng thái hàng loạt.');
    },
  });

  const bulkArchiveMut = useBulkRemoveEmployeesMutation(queryClient, {
    onSuccess: (res) => {
      toast.success(`Đã lưu trữ thành công ${res.succeeded}/${res.total} hồ sơ nhân viên.`);
      table.resetRowSelection();
    },
    onError: () => {
      toast.error('Không thể lưu trữ hàng loạt hồ sơ nhân viên.');
    },
  });

  const handleBulkStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    bulkStatusMut.mutate({
      employeeIds: selectedIds,
      status: bulkTargetStatus,
      effectiveDate: bulkEffectiveDate || undefined,
      reason: bulkReason.trim() || undefined,
    });
  };

  if (isAuthError) {
    return (
      <div className='text-muted-foreground flex min-h-64 items-center justify-center text-sm'>
        {commonUiCopy.sessionExpiredRedirecting}
      </div>
    );
  }

  if (error) {
    return (
      <QueryErrorAlert
        error={error}
        subject={employeeUiCopy.listSubject}
        onRetry={() => void refetch()}
        className='rounded-xl border-destructive/50 bg-destructive/5'
      />
    );
  }

  const emptyState = !employees.length ? (
    <AppEmptyState
      icon={<Icons.employee className='size-12' />}
      title={hasFilters ? commonUiCopy.noResults : 'Chưa có nhân viên nào'}
      description={hasFilters ? 'Thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc phòng ban.' : undefined}
      action={hasFilters ? <ClearFiltersButton /> : undefined}
    />
  ) : undefined;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ willChange: 'transform, opacity' }}
      className='flex flex-1 flex-col gap-4 min-h-0'
    >
      <div className='flex items-center justify-between gap-4'>
        <Tabs
          value={resolvedActiveStatus}
          onValueChange={(value) => {
            setParams({ page: 1, status: value }, { shallow: true }).catch(() => undefined);
          }}
          className='flex flex-1'
        >
          <TabsList className='w-fit'>
            {visibleStatusTabs.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className='flex items-center gap-1.5'
                >
                  <Icon className='h-4 w-4' />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {canCreate ? (
          <Button asChild size='sm'>
            <Link href='/employees/new'>
              <Icons.add className='mr-1.5 h-4 w-4' />
              {employeeUiCopy.actions.addEmployee}
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Bulk Lifecycle Action Bar */}
      {canManage && selectedIds.length > 0 && resolvedActiveStatus !== 'deleted' && (
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs'>
          <div className='flex items-center gap-2'>
            <span className='font-semibold text-foreground'>
              Đã chọn {selectedIds.length} nhân viên
            </span>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-7 text-xs'
              onClick={() => table.resetRowSelection()}
            >
              Bỏ chọn
            </Button>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-7 text-xs'
              onClick={() => setBulkStatusOpen(true)}
            >
              <Icons.refresh className='mr-1.5 size-3.5' />
              Chuyển trạng thái hàng loạt ({selectedIds.length})
            </Button>

            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-7 text-xs text-destructive hover:text-destructive border-destructive/30'
              disabled={bulkArchiveMut.isPending}
              onClick={() => bulkArchiveMut.mutate(selectedIds)}
            >
              <Icons.trash className='mr-1.5 size-3.5' />
              Lưu trữ hàng loạt ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      <div className='flex flex-1 flex-col gap-2 min-h-0 overflow-hidden'>
        <DataTable
          table={table}
          emptyState={emptyState}
          isLoading={isLoading}
          animationKey={resolvedActiveStatus}
          totalRowsLabel='Tổng số nhân viên'
          totalRows={data?.totalEmployees ?? 0}
          onRowMouseEnter={(row) => prefetchEmployeeDetail(row.original.id)}
        >
          <DataTableToolbar table={table}>
            <LaborReportExportDialog />
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!mounted || employees.length === 0}
              onClick={() => downloadTableAsCsv(table.getRowModel().rows, EMPLOYEE_EXPORT_FILENAME)}
              suppressHydrationWarning
            >
              <Icons.fileTypeXls className='mr-1.5 size-4' />
              {EXPORT_LABEL}
            </Button>
          </DataTableToolbar>
        </DataTable>
      </div>

      {/* Bulk Status Change Dialog */}
      <Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <DialogContent className='sm:max-w-[480px]'>
          <form onSubmit={handleBulkStatusSubmit}>
            <DialogHeader>
              <DialogTitle>Chuyển trạng thái nhân sự hàng loạt</DialogTitle>
              <DialogDescription>
                Áp dụng trạng thái vòng đời mới cho <strong>{selectedIds.length}</strong> nhân viên
                đang chọn.
              </DialogDescription>
            </DialogHeader>

            <div className='mt-4 space-y-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='bulk-status-target'>Trạng thái chuyển đến</Label>
                <Select
                  value={bulkTargetStatus}
                  onValueChange={(val) =>
                    setBulkTargetStatus(val as BulkChangeStatusVariables['status'])
                  }
                >
                  <SelectTrigger id='bulk-status-target'>
                    <SelectValue placeholder='Chọn trạng thái' />
                  </SelectTrigger>
                  <SelectContent>
                    {BULK_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='bulk-effective-date'>Ngày hiệu lực</Label>
                <Input
                  id='bulk-effective-date'
                  type='date'
                  value={bulkEffectiveDate}
                  onChange={(e) => setBulkEffectiveDate(e.target.value)}
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='bulk-reason'>Lý do / Số quyết định</Label>
                <Textarea
                  id='bulk-reason'
                  rows={3}
                  placeholder='Nhập lý do hoặc số quyết định nhân sự...'
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className='mt-6 gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setBulkStatusOpen(false)}
                disabled={bulkStatusMut.isPending}
              >
                {commonUiCopy.cancel}
              </Button>
              <Button type='submit' disabled={bulkStatusMut.isPending}>
                {bulkStatusMut.isPending && (
                  <Icons.spinner className='mr-2 size-4 animate-spin' />
                )}
                Xác nhận ({selectedIds.length})
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export function EmployeesTableSkeleton() {
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
