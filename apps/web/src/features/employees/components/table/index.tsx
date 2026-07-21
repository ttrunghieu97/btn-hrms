'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { parseAsArrayOf, parseAsString, useQueryStates } from 'nuqs';
import type { EmployeeResponseDto } from '@/api/generated/model';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataTable } from '@/hooks/use-data-table';
import { commonUiCopy, employeeUiCopy, pageCopy } from '@/lib/app-copy';
import { isUnauthenticatedError } from '@/lib/error-taxonomy';
import { employeesQueryOptions, type EmployeeFilters } from '../../api/queries';
import Link from 'next/link';
import { useDepartmentsQuery, employeeKeys } from '../../queries/employee-queries';
import { columns } from './columns';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { downloadTableAsCsv } from '@/lib/csv/export-csv';
import { useAuthStore } from '@/stores/auth-store';
import { employeesControllerFindOne } from '@/api/generated/endpoints';
import { permissions } from '@/lib/permissions';
import { createTableSearchParams } from '@/lib/pagination';

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

function ClearFiltersButton({ disabled }: { disabled?: boolean }) {
  const [, setParams] = useQueryStates({
    ...createTableSearchParams(COLUMN_IDS),
    name: parseAsString,
    departmentIds: parseAsArrayOf(parseAsString, ',')
  });

  return (
    <button
      type='button'
      className='text-primary underline-offset-2 hover:underline'
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
      Xóa bộ lọc
    </button>
  );
}

export function EmployeesTable() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const currentUser = useAuthStore((state) => state.user);
  const canManage =
    currentUser?.isSuperAdmin ||
    currentUser?.permissions?.includes('ALL') ||
    currentUser?.permissions?.includes(permissions.employees.create) ||
    currentUser?.permissions?.includes(permissions.employees.edit);
  const [selectedEmployee, setSelectedEmployee] = React.useState<EmployeeResponseDto | null>(null);
  const [mounted, setMounted] = React.useState(false);
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

  const detailOpen = !!params.detail;


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
        className='rounded-2xl border-destructive/50 bg-destructive/5'
      />
    );
  }

  const emptyState = !employees.length ? (
    <div className='flex flex-col items-center gap-3 py-10'>
      <Icons.employee className='text-muted-foreground/40 size-12' />
      <div className='flex flex-col items-center gap-1'>
        <p className='text-muted-foreground text-sm'>
          {hasFilters ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có nhân viên nào'}
        </p>
        {hasFilters && <ClearFiltersButton />}
      </div>
    </div>
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

        {canManage ? (
          <Button asChild size='sm'>
            <Link href='/employees/new'>
              <Icons.add className='mr-1.5 h-4 w-4' />
              {employeeUiCopy.actions.addEmployee}
            </Link>
          </Button>
        ) : null}
      </div>

      <div className='flex flex-1 flex-col gap-2 min-h-0'>
        <DataTable
          table={table}
          emptyState={emptyState}
          isLoading={isLoading}
          animationKey={resolvedActiveStatus}
          onRowClick={(row) => handleRowClick(row.original)}
          onRowMouseEnter={(row) => prefetchEmployeeDetail(row.original.id)}
        >
          <DataTableToolbar table={table}>
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
