'use client';

import { useDataTable } from '@/hooks/use-data-table';
import { DataTable } from '@/components/ui/table/data-table';
import { Skeleton } from 'boneyard-js/react';
import { salaryStructureColumns } from './salary-structure-columns';
import type { SalaryStructure } from '../types';

interface Props {
  data: SalaryStructure[];
  total: number;
  loading?: boolean;
}

export function SalaryStructuresTable({ data, total, loading }: Props) {
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const { table } = useDataTable({
    data,
    columns: salaryStructureColumns,
    pageCount,
    initialState: { pagination: { pageSize, pageIndex: 0 } },
    shallow: true,
    debounceMs: 300,
  });

  return (
    <Skeleton name='salary-structures-table' loading={loading ?? false}>
      <DataTable
        table={table}
        isLoading={loading}
        emptyState={
          <div className='text-muted-foreground p-8 text-center'>
            Chưa có cấu trúc lương nào.
          </div>
        }
      />
    </Skeleton>
  );
}
