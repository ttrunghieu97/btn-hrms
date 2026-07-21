'use client';

import type { ColumnDef, Row } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { PayrollRunStatusBadge } from '../components/payroll-run-status-badge';
import type { PayrollRun } from '../types';

export const onEditRunRef = { current: (_item: PayrollRun) => {} };
export const onGenerateRef = { current: (_id: string) => {} };
export const onViewRef = { current: (_id: string) => {} };

function ActionsCell({ row }: { row: Row<PayrollRun> }) {
  return (
    <div className='flex items-center gap-1'>
      <Button variant='ghost' size='icon' onClick={() => onViewRef.current(row.original.id)}>
        <Icons.search className='h-4 w-4' />
      </Button>
      {row.original.status === 'draft' && (
        <>
          <Button variant='ghost' size='icon' onClick={() => onEditRunRef.current(row.original)}>
            <Icons.edit className='h-4 w-4' />
          </Button>
          <Button variant='ghost' size='icon' onClick={() => onGenerateRef.current(row.original.id)}>
            <Icons.sparkles className='h-4 w-4' />
          </Button>
        </>
      )}
    </div>
  );
}

export const payrollRunColumns: ColumnDef<PayrollRun>[] = [
  {
    accessorFn: (row) => row.payrollPeriod?.code ?? '\u2014',
    header: 'Kỳ lương',
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => <PayrollRunStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'processedAt',
    header: 'Ngày xử lý',
    cell: ({ row }) => row.original.processedAt ?? '\u2014',
  },
  {
    accessorKey: 'createdAt',
    header: 'Ngày tạo',
  },
  {
    accessorKey: 'updatedAt',
    header: 'Cập nhật',
  },
  {
    id: 'actions',
    cell: ({ row }) => <ActionsCell row={row} />,
  },
];
