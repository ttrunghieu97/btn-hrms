'use client';

import { useDataTable } from '@/hooks/use-data-table';
import { DataTable } from '@/components/ui/table/data-table';
import { Skeleton } from 'boneyard-js/react';
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
    <Skeleton name='payroll-periods-table' loading={loading ?? false}>
      <DataTable
        table={table}
        isLoading={loading}
        emptyState={
          <div className='text-muted-foreground p-8 text-center'>
            Chưa có kỳ lương nào.
          </div>
        }
      />
    </Skeleton>
  );
}
