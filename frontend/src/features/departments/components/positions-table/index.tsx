'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import type { PositionListItemDto } from '@/api/generated/model';
import { commonUiCopy } from '@/lib/app-copy';
import { isUnauthenticatedError } from '@/lib/error-taxonomy';
import { errorUiCopy } from '@/locales/vi/system-ui';
import { getSortingStateParser } from '@/lib/parsers';
import { usePositionsTableQuery } from '../../queries/department-queries';
import { columns } from './columns';
import { createTableSearchParams } from '@/lib/pagination';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

interface PositionsTableProps {
  onRowClick?: (row: PositionListItemDto) => void;
}

export function PositionsTable({ onRowClick }: PositionsTableProps) {
  const router = useRouter();
  const [params] = useQueryStates({
    ...createTableSearchParams(columnIds),
    name: parseAsString
  });

  const { data: rawData, error, isLoading, refetch } = usePositionsTableQuery();
  const isAuthError = isUnauthenticatedError(error);

  React.useEffect(() => {
    if (!isAuthError) return;
    router.replace('/auth/sign-in');
  }, [isAuthError, router]);

  const sortedPositions = React.useMemo(() => {
    const rows = rawData ?? [];
    if (!params.sort.length) return rows;
    const { id, desc } = params.sort[0];
    return [...rows].sort((a, b) => {
      const aVal = a[id as keyof PositionListItemDto];
      const bVal = b[id as keyof PositionListItemDto];
      const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), 'vi');
      return desc ? -cmp : cmp;
    });
  }, [rawData, params.sort]);

  const { table } = useDataTable({
    data: sortedPositions,
    columns,
    pageCount: Math.max(1, Math.ceil(sortedPositions.length / params.perPage)),
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
        subject={errorUiCopy.subjects.positionsList}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading) {
    return <PositionsTableSkeleton />;
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

export function PositionsTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-64 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
