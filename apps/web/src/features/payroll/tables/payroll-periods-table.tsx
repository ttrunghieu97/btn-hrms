'use client';

import { useDataTable } from '@/hooks/use-data-table';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Icons } from '@/components/icons';
import { payrollPeriodColumns, onEditPeriodRef } from './payroll-period-columns';
import type { PayrollPeriod } from '../types';

interface Props {
  data: PayrollPeriod[];
  total: number;
  loading?: boolean;
  onEdit: (item: PayrollPeriod) => void;
}

export function PayrollPeriodsTable({ data, total, loading, onEdit }: Props) {
  onEditPeriodRef.current = onEdit;

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const { table } = useDataTable({
    data,
    columns: payrollPeriodColumns,
    pageCount,
    initialState: { pagination: { pageSize, pageIndex: 0 } },
    shallow: true,
    debounceMs: 300,
  });

  return (
    <DataTable
      table={table}
      isLoading={loading}
      totalRowsLabel='Tổng số kỳ lương'
      totalRows={total}
      emptyState={
        <AppEmptyState
          icon={<Icons.page className='size-10' />}
          title='Chưa có kỳ lương nào'
          compact
        />
      }
    >
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
