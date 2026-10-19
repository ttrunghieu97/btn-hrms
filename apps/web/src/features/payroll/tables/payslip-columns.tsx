'use client';

import type { ColumnDef, Row } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { MoneyCell } from '@/components/common/money-cell';
import { PayslipStatusBadge } from '../components/payslip-status-badge';
import { formatDateVN } from '@/lib/date';
import type { Payslip } from '../types';

export const onViewPayslipRef = { current: (_id: string) => {} };
export const onPublishRef = { current: (_id: string) => {} };

export function isProvisionalPayslip(row: Payslip): boolean {
  const meta = row.metadata ?? {};
  if (
    row.isProvisional === true ||
    row.calculationStatus === 'PROVISIONAL_POLICY_UNCONFIRMED' ||
    meta.isProvisional === true ||
    meta.calculationStatus === 'PROVISIONAL_POLICY_UNCONFIRMED'
  ) {
    return true;
  }
  if (row.calculationStatus === 'CONFIRMED' || meta.calculationStatus === 'CONFIRMED') {
    return false;
  }
  return false;
}

function ActionsCell({ row }: { row: Row<Payslip> }) {
  const provisional = isProvisionalPayslip(row.original);
  return (
    <div className='flex items-center gap-1'>
      <Button
        variant='ghost'
        size='icon'
        aria-label='Xem chi tiết phiếu lương'
        onClick={() => onViewPayslipRef.current(row.original.id)}
      >
        <Icons.search className='h-4 w-4' />
      </Button>
      {row.original.status === 'draft' && (
        <Button
          variant='ghost'
          size='icon'
          aria-label='Công bố phiếu lương'
          disabled={provisional}
          title={
            provisional
              ? 'Phiếu lương tạm tính (PD-04) — Chưa thể công bố'
              : 'Công bố phiếu lương'
          }
          onClick={() => onPublishRef.current(row.original.id)}
        >
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
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5'>
        <PayslipStatusBadge status={row.original.status} />
        {isProvisionalPayslip(row.original) && (
          <span className='rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300'>
            Tạm tính (PD-04)
          </span>
        )}
      </div>
    ),
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
    cell: ({ row }) => row.original.publishedAt ? formatDateVN(row.original.publishedAt) : '\u2014',
  },
  {
    id: 'actions',
    cell: ({ row }) => <ActionsCell row={row} />,
  },
];
