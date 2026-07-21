'use client';

import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { useApprovalRequestsQuery } from '../api/queries';
import type { ApprovalRequest } from '../api/service';
import { StatusBadge, type StatusMap } from '@/components/ui/status-badge';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { DataTableFacetedFilter } from '@/components/ui/table/data-table-faceted-filter';
import { useDataTable } from '@/hooks/use-data-table';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Icons } from '@/components/icons';
import { formatDateVN } from "@/lib/date";
import { perPageParser, pageParser } from '@/lib/pagination';

const REQUEST_STATUS_MAP: StatusMap = {
  pending: { label: 'Chờ duyệt', variant: 'outline' },
  approved: { label: 'Đã duyệt', variant: 'default' },
  rejected: { label: 'Từ chối', variant: 'destructive' },
  cancelled: { label: 'Đã hủy', variant: 'secondary' },
};

const STATUS_FILTER_OPTIONS = [
  { label: 'Chờ duyệt', value: 'pending' },
  { label: 'Đã duyệt', value: 'approved' },
  { label: 'Từ chối', value: 'rejected' },
  { label: 'Đã hủy', value: 'cancelled' },
];

const columnHelper = createColumnHelper<ApprovalRequest>();

export default function ApprovalRequestsListPage() {
  const [params] = useQueryStates({
    page: pageParser,
    perPage: perPageParser,
    status: parseAsString,
  });

  const { data, error, isLoading, refetch } = useApprovalRequestsQuery({
    page: params.page,
    limit: params.perPage,
    status: params.status || undefined,
  });

  const requests = data?.rows ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / params.perPage));

  const columns = useMemo(() => [
    columnHelper.accessor((row) => `${row.subjectType}:${row.subjectId}`, {
      id: 'subject',
      header: 'Chủ đề',
      cell: ({ row }) => (
        <div>
          <span className='font-mono text-xs'>{row.original.subjectType}:{row.original.subjectId}</span>
          {row.original.policy?.name && (
            <div className='text-xs text-muted-foreground'>{row.original.policy.name}</div>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: 'Trạng thái',
      meta: {
        options: STATUS_FILTER_OPTIONS,
      },
      cell: ({ getValue }) => <StatusBadge status={getValue()} mapping={REQUEST_STATUS_MAP} />,
    }),
    columnHelper.accessor('currentStepIndex', {
      id: 'step',
      header: 'Bước',
      cell: ({ row }) => {
        const total = row.original.steps?.length ?? '?';
        return <span className='text-xs text-muted-foreground'>{row.original.currentStepIndex + 1} / {total}</span>;
      },
    }),
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: 'Ngày tạo',
      cell: ({ getValue }) => {
        const date = getValue();
        return <span className='text-xs text-muted-foreground'>{formatDateVN(date)}</span>;
      },
    }),
  ], []);

  const { table } = useDataTable({
    data: requests,
    columns,
    pageCount,
    tableId: 'approval-requests',
  });

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject='yêu cầu phê duyệt'
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <DataTable
        table={table}
        isLoading={isLoading}
        emptyState={
          <AppEmptyState
            icon={<Icons.task className='size-10' />}
            title='Không có yêu cầu phê duyệt'
            compact
          />
        }
      >
        <DataTableToolbar table={table}>
          <DataTableFacetedFilter
            column={table.getColumn('status')!}
            title='Trạng thái'
            options={STATUS_FILTER_OPTIONS}
          />
        </DataTableToolbar>
      </DataTable>
    </div>
  );
}
