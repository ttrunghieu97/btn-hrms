'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { commonUiCopy, departmentUiCopy } from '@/lib/app-copy';
import { isUnauthenticatedError } from '@/lib/error-taxonomy';
import { getSortingStateParser } from '@/lib/parsers';
import {
  toDepartmentSort,
  useDepartmentsTableQuery,
  type DepartmentListQueryParams,
  type DepartmentRow
} from '../../queries/department-queries';
import { columns } from './columns';
import { createTableSearchParams } from '@/lib/pagination';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

interface DepartmentsTableProps {
  onRowClick?: (row: DepartmentRow) => void;
}

export function DepartmentsTable({ onRowClick }: DepartmentsTableProps) {
  const router = useRouter();
  const [params] = useQueryStates({
    ...createTableSearchParams(columnIds),
    name: parseAsString
  });

  const queryParams = React.useMemo<DepartmentListQueryParams>(
    () => ({
      page: params.page,
      limit: params.perPage,
      ...(params.name ? { name: params.name } : {}),
      ...(params.sort.length ? { sort: toDepartmentSort(params.sort) } : {})
    }),
    [params.page, params.perPage, params.name, params.sort]
  );

  const { data, error, isLoading, refetch } = useDepartmentsTableQuery(queryParams);
  const isAuthError = isUnauthenticatedError(error);

  React.useEffect(() => {
    if (!isAuthError) return;
    router.replace('/auth/sign-in');
  }, [isAuthError, router]);

  const { table } = useDataTable({
    data: data?.rows ?? [],
    columns,
    pageCount: Math.max(1, Math.ceil((data?.pagination?.total ?? 0) / params.perPage)),
    shallow: true,
    debounceMs: 300
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
        subject={departmentUiCopy.listSubject}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading) {
    return <DepartmentsTableSkeleton />;
  }

  return (
    <DataTable
      table={table}
      onRowClick={onRowClick ? (row) => onRowClick(row.original) : undefined}
    >
      <DataTableToolbar table={table} />
    </DataTable>
  );
}

export function DepartmentsTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-64 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
