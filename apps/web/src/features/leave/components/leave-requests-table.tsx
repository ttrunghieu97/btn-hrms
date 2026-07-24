'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { leaveRequestsQueryOptions, leaveTypesQueryOptions } from '../api/queries';
import { useCancelLeaveRequest } from '../api/mutations';
import { extractList, extractPagination } from '@/lib/api-extract';
import type { LeaveListFilters } from '../queries/leave-queries';
import { StatusBadge, type StatusMap } from '@/components/ui/status-badge';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { DataTableFacetedFilter } from '@/components/ui/table/data-table-faceted-filter';
import { useDataTable } from '@/hooks/use-data-table';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { commonUiCopy, leaveUiCopy } from '@/lib/app-copy';
import { CreateLeaveRequestDialog } from './create-leave-request-dialog';
import { perPageParser, pageParser } from '@/lib/pagination';

const LEAVE_STATUS_MAP: StatusMap = {
  draft: { label: leaveUiCopy.statusDraft, variant: 'outline' },
  pending: { label: leaveUiCopy.statusPending, variant: 'secondary' },
  approved: { label: leaveUiCopy.statusApproved, variant: 'default' },
  rejected: { label: leaveUiCopy.statusRejected, variant: 'destructive' },
  cancelled: { label: leaveUiCopy.statusCancelled, variant: 'outline' },
};

const STATUS_FILTER_OPTIONS = [
  { label: leaveUiCopy.statusDraft, value: 'draft' },
  { label: leaveUiCopy.statusPending, value: 'pending' },
  { label: leaveUiCopy.statusApproved, value: 'approved' },
  { label: leaveUiCopy.statusRejected, value: 'rejected' },
  { label: leaveUiCopy.statusCancelled, value: 'cancelled' },
];

interface LeaveRequestRow {
  id: string;
  employeeId?: string;
  employeeName?: string;
  leaveTypeId?: string;
  leaveTypeName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  reason?: string;
  totalUnits?: string;
}

const columnHelper = createColumnHelper<LeaveRequestRow>();

export function LeaveRequestsTable() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    perPage: perPageParser,
    status: parseAsString,
  });

  const filters: LeaveListFilters = {
    page: params.page,
    limit: params.perPage,
    ...(params.status ? { status: params.status } : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(leaveRequestsQueryOptions(filters));
  const { data: typesData } = useQuery(leaveTypesQueryOptions());

  const requests = extractList<LeaveRequestRow>(data);
  const pagination = extractPagination(data);
  const pageCount = Math.max(1, Math.ceil((pagination?.total ?? 0) / params.perPage));
  const cancelLeave = useCancelLeaveRequest();

  const columns = useMemo(() => [
    columnHelper.accessor('employeeName', {
      id: 'employee',
      header: commonUiCopy.employee ?? 'Nhân viên',
      cell: ({ getValue }) => (
        <span className='text-sm'>{getValue() ?? '—'}</span>
      ),
    }),
    columnHelper.accessor('leaveTypeName', {
      id: 'type',
      header: commonUiCopy.type ?? 'Loại',
      cell: ({ getValue }) => (
        <span className='text-sm'>{getValue() ?? '—'}</span>
      ),
    }),
    columnHelper.accessor('totalUnits', {
      id: 'totalUnits',
      header: 'Số ngày',
      cell: ({ getValue }) => (
        <span className='text-sm'>{getValue() ?? '—'}</span>
      ),
    }),
    columnHelper.accessor((row) => `${row.startDate ?? ''} → ${row.endDate ?? ''}`, {
      id: 'date',
      header: commonUiCopy.date ?? 'Ngày',
      cell: ({ row }) => {
        const { startDate, endDate } = row.original;
        return (
          <span className='text-sm'>
            {startDate ?? '—'} → {endDate ?? '—'}
          </span>
        );
      },
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: leaveUiCopy.statusLabel,
      meta: {
        options: STATUS_FILTER_OPTIONS,
      },
      cell: ({ getValue }) => {
        const status = getValue();
        return <StatusBadge status={status ?? ''} mapping={LEAVE_STATUS_MAP} />;
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const { id, status } = row.original;
        const canCancel = status === 'draft' || status === 'pending';
        if (!canCancel) return null;
        return (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => cancelLeave.mutate({ id })}
            disabled={cancelLeave.isPending}
          >
            {leaveUiCopy.actions.cancel ?? 'Hủy'}
          </Button>
        );
      },
    }),
  ], [cancelLeave]);

  const { table } = useDataTable({
    data: requests,
    columns,
    pageCount,
    tableId: 'leave-requests',
  });

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject={leaveUiCopy.allRequests}
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{leaveUiCopy.allRequests}</h2>
        <CreateLeaveRequestDialog />
      </div>
      <DataTable
        table={table}
        isLoading={isLoading}
        totalRowsLabel='Tổng số đơn xin nghỉ'
        emptyState={
          <AppEmptyState
            icon={<Icons.calendar className='size-10' />}
            title={leaveUiCopy.noRequests}
            compact
          />
        }
      >
        <DataTableToolbar table={table}>
          <DataTableFacetedFilter
            column={table.getColumn('status')!}
            title={leaveUiCopy.statusLabel}
            options={STATUS_FILTER_OPTIONS}
          />
        </DataTableToolbar>
      </DataTable>
    </div>
  );
}
