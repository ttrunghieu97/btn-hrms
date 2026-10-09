'use client';

import { useDataTable } from '@/hooks/use-data-table';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Icons } from '@/components/icons';
import { payslipColumns, onViewPayslipRef, onPublishRef } from './payslip-columns';
import type { Payslip } from '../types';

interface Props {
  data: Payslip[];
  total: number;
  loading?: boolean;
  onView: (id: string) => void;
  onPublish: (id: string) => void;
}

export function PayslipsTable({ data, total, loading, onView, onPublish }: Props) {
  onViewPayslipRef.current = onView;
  onPublishRef.current = onPublish;

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const { table } = useDataTable({
    data,
    columns: payslipColumns,
    pageCount,
    initialState: { pagination: { pageSize, pageIndex: 0 } },
    shallow: true,
    debounceMs: 300,
  });

  return (
    <DataTable
      table={table}
      isLoading={loading}
      totalRowsLabel='Tổng số phiếu lương'
      totalRows={total}
      emptyState={
        <AppEmptyState
          icon={<Icons.page className='size-10' />}
          title='Chưa có phiếu lương nào'
          compact
        />
      }
    >
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
