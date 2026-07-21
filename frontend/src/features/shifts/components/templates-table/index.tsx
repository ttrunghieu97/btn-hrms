'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { commonUiCopy, shiftUiCopy } from '@/lib/app-copy';
import { isUnauthenticatedError } from '@/lib/error-taxonomy';
import { errorUiCopy } from '@/locales/vi/system-ui';
import { getSortingStateParser } from '@/lib/parsers';
import { shiftsTemplatesQueryOptions, type ShiftTemplateRow } from '../../api/queries';
import { createTemplateColumns } from './columns';
import { createTableSearchParams } from '@/lib/pagination';

const baseColumns = createTemplateColumns(() => undefined, () => undefined);
const columnIds = baseColumns.map((column) => column.id).filter(Boolean) as string[];

interface TemplatesTableProps {
  onEdit: (row: ShiftTemplateRow) => void;
  onArchive: (row: ShiftTemplateRow) => void;
}

export function TemplatesTable({ onEdit, onArchive }: TemplatesTableProps) {
  const router = useRouter();
  const [params] = useQueryStates({
    ...createTableSearchParams(columnIds),
    search: parseAsString,
    status: parseAsString
  });

  const filters = {
    page: params.page,
    limit: params.perPage,
    ...(params.search && { search: params.search }),
    ...(params.status && { status: params.status as 'draft' | 'published' | 'archived' }),
    ...(params.sort.length > 0 && { sort: JSON.stringify(params.sort) })
  };

  const { data, error, isLoading, refetch } = useQuery(shiftsTemplatesQueryOptions(filters));
  const isAuthError = isUnauthenticatedError(error);

  React.useEffect(() => {
    if (!isAuthError) return;
    router.replace('/auth/sign-in');
  }, [isAuthError, router]);

  const columns = React.useMemo(
    () => createTemplateColumns((row) => onEdit(row), onArchive),
    [onArchive, onEdit]
  );
  const pageCount = Math.max(1, Math.ceil((data?.pagination?.total ?? 0) / params.perPage));
  const { table } = useDataTable({
    data: data?.templates ?? [],
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500
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
        subject={errorUiCopy.subjects.shiftTemplatesList}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading || !data) {
    return <TemplatesTableSkeleton />;
  }

  const hasActiveFilters = Boolean(params.search || params.status || params.sort.length > 0);

  return (
    <div className='flex flex-1 flex-col gap-2'>
      {data.templates.length === 0 ? (
        <div className='text-muted-foreground text-sm'>
          {hasActiveFilters ? shiftUiCopy.templates.emptyFiltered : shiftUiCopy.templates.empty}
        </div>
      ) : null}
      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  );
}

function TemplatesTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
