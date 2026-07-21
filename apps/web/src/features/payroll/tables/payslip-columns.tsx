'use client';

import type { ColumnDef, Row } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { MoneyCell } from '@/components/common/money-cell';
import { PayslipStatusBadge } from '../components/payslip-status-badge';
import type { Payslip } from '../types';

export const onViewPayslipRef = { current: (_id: string) => {} };
export const onPublishRef = { current: (_id: string) => {} };

function ActionsCell({ row }: { row: Row<Payslip> }) {
  return (
    <div className='flex items-center gap-1'>
      <Button variant='ghost' size='icon' onClick={() => onViewPayslipRef.current(row.original.id)}>
        <Icons.search className='h-4 w-4' />
      </Button>
      {row.original.status === 'draft' && (
        <Button variant='ghost' size='icon' onClick={() => onPublishRef.current(row.original.id)}>
          <Icons.circleCheck className='h-4 w-4' />
        </Button>
      )}
    </div>
  );
}

export const payslipColumns: ColumnDef<Payslip>[] = [
  {
    accessorFn: (row) => row.employee?.employeeCode ?? '\u2014',
    header: 'Mã NV',
  },
  {
    accessorFn: (row) => row.employee?.fullName ?? '\u2014',
    header: 'Nhân viên',
  },
  {
    accessorFn: (row) => row.employee?.departmentName ?? '\u2014',
    header: 'Phòng ban',
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => <PayslipStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'grossPay',
    header: 'Tổng thu nhập',
    cell: ({ row }) => <MoneyCell amount={row.original.grossPay} currency={row.original.currency} />,
  },
  {
    accessorKey: 'totalDeductions',
    header: 'Khấu trừ',
    cell: ({ row }) => <MoneyCell amount={row.original.totalDeductions} currency={row.original.currency} />,
  },
  {
    accessorKey: 'netPay',
    header: 'Thực nhận',
    cell: ({ row }) => <MoneyCell amount={row.original.netPay} currency={row.original.currency} className='font-semibold' />,
  },
  {
    accessorKey: 'publishedAt',
    header: 'Ngày công bố',
    cell: ({ row }) => row.original.publishedAt ?? '\u2014',
  },
  {
    id: 'actions',
    cell: ({ row }) => <ActionsCell row={row} />,
  },
];
