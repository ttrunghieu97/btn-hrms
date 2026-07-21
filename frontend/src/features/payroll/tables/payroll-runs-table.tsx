'use client';

import { useDataTable } from '@/hooks/use-data-table';
import { DataTable } from '@/components/ui/table/data-table';
import { Skeleton } from 'boneyard-js/react';
import { payrollRunColumns, onEditRunRef, onGenerateRef, onViewRef } from './payroll-run-columns';
import type { PayrollRun } from '../types';

interface Props {
  data: PayrollRun[];
  total: number;
  loading?: boolean;
  onEdit: (item: PayrollRun) => void;
  onGenerate: (id: string) => void;
  onView: (id: string) => void;
}

export function PayrollRunsTable({ data, total, loading, onEdit, onGenerate, onView }: Props) {
  onEditRunRef.current = onEdit;
  onGenerateRef.current = onGenerate;
  onViewRef.current = onView;

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const { table } = useDataTable({
    data,
    columns: payrollRunColumns,
    pageCount,
    initialState: { pagination: { pageSize, pageIndex: 0 } },
    shallow: true,
    debounceMs: 300,
  });

  return (
    <Skeleton name='payroll-runs-table' loading={loading ?? false}>
      <DataTable
        table={table}
        isLoading={loading}
        emptyState={
          <div className='text-muted-foreground p-8 text-center'>
            Chưa có bảng lương nào.
          </div>
        }
      />
    </Skeleton>
  );
}
