'use client';

import type { ColumnDef, Row } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { PERIOD_STATUS_OPTIONS, PERIOD_STATUS_COLORS } from '../schemas/payroll-period-schema';
import type { PayrollPeriod } from '../types';

const statusLabel = (value: string): string => {
  const found = PERIOD_STATUS_OPTIONS.find((opt) => opt.value === value);
  return found?.label ?? value;
};

export const onEditPeriodRef = { current: (_item: PayrollPeriod) => {} };

function ActionsCell({ row }: { row: Row<PayrollPeriod> }) {
  return (
    <Button variant='ghost' size='icon' onClick={() => onEditPeriodRef.current(row.original)}>
      <Icons.edit className='h-4 w-4' />
    </Button>
  );
}

export const payrollPeriodColumns: ColumnDef<PayrollPeriod>[] = [
  {
    accessorKey: 'code',
    header: 'Mã kỳ',
  },
  {
    accessorKey: 'name',
    header: 'Tên kỳ lương',
  },
  {
    accessorKey: 'startsOn',
    header: 'Bắt đầu',
  },
  {
    accessorKey: 'endsOn',
    header: 'Kết thúc',
  },
  {
    accessorKey: 'payDate',
    header: 'Ngày trả',
    cell: ({ row }) => row.original.payDate ?? '\u2014',
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => (
      <Badge variant={PERIOD_STATUS_COLORS[row.original.status] ?? 'secondary'}>
        {statusLabel(row.original.status)}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <ActionsCell row={row} />,
  },
];
