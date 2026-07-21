'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import type { TasksControllerListParams } from '@/api/generated/model';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { errorUiCopy } from '@/locales/vi/system-ui';
import { getSortingStateParser } from '@/lib/parsers';
import { tasksQueryOptions, myTasksQueryOptions } from '../../queries/task-queries';
import type { Task } from '../../utils/task-types';
import { asTasks } from '../../utils/task-types';
import { columns } from './columns';
import { createTableSearchParams } from '@/lib/pagination';

const tempColumnIds = columns(() => {}).map((c) => c.id).filter(Boolean) as string[];

interface TasksTableProps {
  scope: 'all' | 'mine';
  onRowClick: (task: Task) => void;
}

export function TasksTable({ scope, onRowClick }: TasksTableProps) {
  const [params] = useQueryStates({
    ...createTableSearchParams(tempColumnIds),
    search: parseAsString,
    status: parseAsString
  });

  const sortOption = params.sort?.[0];
  const sortBy = sortOption ? sortOption.id : undefined;
  const sortOrder = sortOption ? (sortOption.desc ? 'desc' : 'asc') : undefined;

  const filters: TasksControllerListParams = {
    page: params.page,
    limit: params.perPage,
    search: params.search || undefined,
    status: params.status ? (params.status as TasksControllerListParams['status']) : undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder ? (sortOrder as any) : undefined
  };

  const queryAll = useQuery({
    queryKey: tasksQueryOptions(filters).queryKey,
    queryFn: tasksQueryOptions(filters).queryFn,
    enabled: scope === 'all'
  });

  const queryMine = useQuery({
    queryKey: myTasksQueryOptions(filters).queryKey,
    queryFn: myTasksQueryOptions(filters).queryFn,
    enabled: scope === 'mine'
  });

  const result = scope === 'mine' ? queryMine : queryAll;
  const { data, error, isLoading, refetch } = result;

  const tasks: Task[] = React.useMemo(() => asTasks(data?.tasks ?? []), [data?.tasks]);
  const pageCount = Math.max(1, Math.ceil((data?.totalTasks ?? 0) / params.perPage));
  const cols = React.useMemo(() => columns(onRowClick), [onRowClick]);

  const { table } = useDataTable({
    data: tasks,
    columns: cols,
    pageCount,
    shallow: true,
    debounceMs: 500
  });

  if (error) {
    return (
      <QueryErrorAlert
        error={error}
        subject={errorUiCopy.subjects.tasksList}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading || !data) {
    return <TasksTableSkeleton />;
  }

  return (
    <div className='flex flex-1 flex-col gap-2'>
      <DataTable table={table} onRowClick={(row) => onRowClick(row.original)}>
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  );
}

export function TasksTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
