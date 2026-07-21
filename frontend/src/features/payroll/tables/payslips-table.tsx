'use client';

import { useDataTable } from '@/hooks/use-data-table';
import { DataTable } from '@/components/ui/table/data-table';
import { Skeleton } from 'boneyard-js/react';
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
    <Skeleton name='payslips-table' loading={loading ?? false}>
      <DataTable
        table={table}
        isLoading={loading}
        emptyState={
          <div className='text-muted-foreground p-8 text-center'>
            Chưa có phiếu lương nào.
          </div>
        }
      />
    </Skeleton>
  );
}
