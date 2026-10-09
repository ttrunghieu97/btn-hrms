'use client';

import { useDataTable } from '@/hooks/use-data-table';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Icons } from '@/components/icons';
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
    <DataTable
      table={table}
      isLoading={loading}
      totalRowsLabel='Tổng số cấu trúc lương'
      totalRows={total}
      emptyState={
        <AppEmptyState
          icon={<Icons.page className='size-10' />}
          title='Chưa có cấu trúc lương nào'
          compact
        />
      }
    >
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
