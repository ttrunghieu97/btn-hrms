'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { commonUiCopy } from '@/lib/app-copy';
import { isUnauthenticatedError } from '@/lib/error-taxonomy';
import { errorUiCopy } from '@/locales/vi/system-ui';
import { getSortingStateParser } from '@/lib/parsers';
import { usersQueryOptions } from '../../api/queries';
import { columns } from './columns';
import { createTableSearchParams } from '@/lib/pagination';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

export function UsersTable() {
  const router = useRouter();
  const [params] = useQueryStates({
    ...createTableSearchParams(columnIds),
    name: parseAsString
  });

  const filters = {
    page: params.page,
    limit: params.perPage,
    ...(params.name && { search: params.name }),
    ...(params.sort.length > 0 && { sort: JSON.stringify(params.sort) })
  };

  const { data, error, isLoading, refetch } = useQuery(usersQueryOptions(filters));
  const isAuthError = isUnauthenticatedError(error);

  React.useEffect(() => {
    if (!isAuthError) return;
    router.replace('/auth/sign-in');
  }, [isAuthError, router]);

  const pageCount = Math.ceil((data?.total_users ?? 0) / params.perPage);
  const { table } = useDataTable({
    data: data?.users ?? [],
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    initialState: {
      columnPinning: { right: ['actions'] }
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
        subject={errorUiCopy.subjects.usersList}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading || !data) {
    return <UsersTableSkeleton />;
  }

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}

export function UsersTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
