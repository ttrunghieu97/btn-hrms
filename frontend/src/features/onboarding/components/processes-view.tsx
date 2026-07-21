'use client';

import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsInteger } from 'nuqs';
import { onboardingProcessesQueryOptions } from '../api/queries';
import { extractList, extractPagination } from '@/lib/api-extract';
import { StatusBadge, type StatusMap } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/table/data-table';
import { useDataTable } from '@/hooks/use-data-table';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Icons } from '@/components/icons';
import { commonUiCopy } from '@/lib/app-copy';
import Link from 'next/link';
import { pageParser, perPageParser, limitParser } from '@/lib/pagination';

const ONBOARDING_STATUS_MAP: StatusMap = {
  pending: { label: 'Chờ xử lý', variant: 'outline' },
  in_progress: { label: 'Đang thực hiện', variant: 'secondary' },
  completed: { label: 'Hoàn tất', variant: 'default' },
  cancelled: { label: 'Đã hủy', variant: 'destructive' },
  terminated: { label: 'Kết thúc', variant: 'outline' },
};

interface OnboardingProcessRow {
  id: string;
  employeeId: string;
  status: string;
  startDate: string;
  completedAt: string | null;
  createdAt: string;
}

const columnHelper = createColumnHelper<OnboardingProcessRow>();

export function OnboardingProcessesView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    limit: limitParser,
  });

  const { data, error, isLoading, refetch } = useQuery(onboardingProcessesQueryOptions(params.page, params.limit));
  const rows = extractList<OnboardingProcessRow>(data);
  const pagination = extractPagination(data);
  const pageCount = Math.max(1, Math.ceil((pagination?.total ?? 0) / params.limit));

  const columns = useMemo(() => [
    columnHelper.accessor('employeeId', {
      id: 'employee',
      header: commonUiCopy.employee ?? 'Nhân viên',
      cell: ({ getValue }) => <span className='font-mono text-xs'>{getValue()?.slice(0, 8) ?? '—'}</span>,
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ getValue }) => {
        const status = getValue();
        return <StatusBadge status={status ?? ''} mapping={ONBOARDING_STATUS_MAP} />;
      },
    }),
    columnHelper.accessor('startDate', {
      id: 'startDate',
      header: 'Ngày bắt đầu',
      cell: ({ getValue }) => <span className='text-sm'>{getValue() ?? '—'}</span>,
    }),
    columnHelper.accessor('completedAt', {
      id: 'completedAt',
      header: 'Ngày hoàn tất',
      cell: ({ getValue }) => <span className='text-sm'>{getValue() ?? '—'}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const { id } = row.original;
        return (
          <Button variant='ghost' size='sm' asChild>
            <Link href={`/onboarding?id=${id}`}>Chi tiết</Link>
          </Button>
        );
      },
    }),
  ], []);

  const { table } = useDataTable({
    data: rows,
    columns,
    pageCount,
    tableId: 'onboarding-processes',
  });

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject='Quy trình Onboarding'
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <h2 className='text-lg font-semibold'>Quy trình Onboarding</h2>
      <DataTable
        table={table}
        isLoading={isLoading}
        emptyState={
          <AppEmptyState
            icon={<Icons.user2 className='size-10' />}
            title='Chưa có quy trình onboarding nào'
            compact
          />
        }
      />
      {pagination && pagination.total > 20 && (
        <div className='flex items-center justify-end gap-2'>
          <Button variant='outline' size='sm' disabled={params.page <= 1} onClick={() => setParams({ page: params.page - 1 })}>‹</Button>
          <span className='text-sm text-muted-foreground'>{params.page}</span>
          <Button variant='outline' size='sm' disabled={params.page * 20 >= pagination.total} onClick={() => setParams({ page: params.page + 1 })}>›</Button>
        </div>
      )}
    </div>
  );
}
