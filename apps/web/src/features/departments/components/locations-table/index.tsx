'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryStates } from 'nuqs';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { commonUiCopy } from '@/lib/app-copy';
import { isUnauthenticatedError } from '@/lib/error-taxonomy';
import { createTableSearchParams } from '@/lib/pagination';
import { useLocationsTableQuery, type LocationListItemDto } from '../../queries/department-queries';
import { columns } from './columns';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

interface LocationsTableProps {
  onRowClick?: (row: LocationListItemDto) => void;
}

export function LocationsTable({ onRowClick }: LocationsTableProps) {
  const router = useRouter();
  const [params] = useQueryStates({
    ...createTableSearchParams(columnIds),
    name: parseAsString
  });

  const { data: rawData, error, isLoading, refetch } = useLocationsTableQuery();
  const isAuthError = isUnauthenticatedError(error);

  React.useEffect(() => {
    if (!isAuthError) return;
    router.replace('/auth/sign-in');
  }, [isAuthError, router]);

  const filteredAndSortedLocations = React.useMemo(() => {
    let rows = rawData ?? [];
    if (params.name) {
      const q = params.name.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.address && r.address.toLowerCase().includes(q))
      );
    }
    if (!params.sort.length) return rows;
    const { id, desc } = params.sort[0];
    return [...rows].sort((a, b) => {
      const aVal = a[id as keyof LocationListItemDto];
      const bVal = b[id as keyof LocationListItemDto];
      const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), 'vi');
      return desc ? -cmp : cmp;
    });
  }, [rawData, params.name, params.sort]);

  const { table } = useDataTable({
    data: filteredAndSortedLocations,
    columns,
    pageCount: Math.max(1, Math.ceil(filteredAndSortedLocations.length / params.perPage)),
    shallow: true,
    debounceMs: 300,
    meta: {
      onRowClick
    }
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
        subject='danh sách địa điểm làm việc'
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading && !rawData) {
    return <LocationsTableSkeleton />;
  }

  return (
    <DataTable
      table={table}
      isLoading={isLoading}
      totalRowsLabel='Tổng số địa điểm'
      totalRows={filteredAndSortedLocations.length}
      onRowClick={onRowClick ? (row) => onRowClick(row.original) : undefined}
    >
      <DataTableToolbar table={table} />
    </DataTable>
  );
}

export function LocationsTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-64 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
