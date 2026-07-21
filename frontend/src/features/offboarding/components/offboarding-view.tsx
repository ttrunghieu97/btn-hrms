'use client';

import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { useOffboardingList } from '../queries';
import { StatusBadge, type StatusMap } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { DataTableFacetedFilter } from '@/components/ui/table/data-table-faceted-filter';
import { useDataTable } from '@/hooks/use-data-table';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Icons } from '@/components/icons';
import { commonUiCopy } from '@/lib/app-copy';
import Link from 'next/link';
import { pageParser, perPageParser, limitParser } from '@/lib/pagination';

const OFFBOARDING_STATUS_MAP: StatusMap = {
  initiated: { label: 'Khởi tạo', variant: 'outline' },
  in_progress: { label: 'Đang xử lý', variant: 'secondary' },
  clearance_pending: { label: 'Chờ duyệt', variant: 'outline' },
  awaiting_settlement: { label: 'Chờ thanh toán', variant: 'secondary' },
  completed: { label: 'Hoàn tất', variant: 'default' },
  cancelled: { label: 'Đã hủy', variant: 'destructive' },
};

const STATUS_FILTER_OPTIONS = [
  { label: 'Khởi tạo', value: 'initiated' },
  { label: 'Đang xử lý', value: 'in_progress' },
  { label: 'Chờ duyệt', value: 'clearance_pending' },
  { label: 'Chờ thanh toán', value: 'awaiting_settlement' },
  { label: 'Hoàn tất', value: 'completed' },
  { label: 'Đã hủy', value: 'cancelled' },
];

interface OffboardingRow {
  id: string;
  employeeId?: string;
  employeeName?: string;
  status: string;
  startDate: string;
  completedAt?: string | null;
}

const columnHelper = createColumnHelper<OffboardingRow>();

export function OffboardingView() {
  const [params] = useQueryStates({
    page: pageParser,
    limit: limitParser,
    status: parseAsString,
  });

  const { data, error, isLoading, refetch } = useOffboardingList(params.page, params.limit);
  const rows: OffboardingRow[] = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / params.limit));

  const columns = useMemo(() => [
    columnHelper.accessor('employeeName', {
      id: 'employee',
      header: commonUiCopy.employee ?? 'Nhân viên',
      cell: ({ getValue }) => <span className='text-sm'>{getValue() ?? '—'}</span>,
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: 'Trạng thái',
      meta: { options: STATUS_FILTER_OPTIONS },
      cell: ({ getValue }) => {
        const status = getValue();
        return <StatusBadge status={status ?? ''} mapping={OFFBOARDING_STATUS_MAP} />;
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
            <Link href={`/offboarding?id=${id}`}>Chi tiết</Link>
          </Button>
        );
      },
    }),
  ], []);

  const { table } = useDataTable({
    data: rows,
    columns,
    pageCount,
    tableId: 'offboarding-list',
  });

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject='Offboarding'
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <h2 className='text-lg font-semibold'>Quy trình Offboarding</h2>
      <DataTable
        table={table}
        isLoading={isLoading}
        emptyState={
          <AppEmptyState
            icon={<Icons.logout className='size-10' />}
            title='Chưa có quy trình offboarding nào'
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
