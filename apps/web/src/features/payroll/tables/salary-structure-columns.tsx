'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { MoneyCell } from '@/components/common/money-cell';
import { PAY_FREQUENCY_OPTIONS } from '../schemas/salary-structure-schema';
import type { SalaryStructure } from '../types';

const payFrequencyLabel = (value: string): string => {
  const found = PAY_FREQUENCY_OPTIONS.find((opt) => opt.value === value);
  return found?.label ?? value;
};

export const salaryStructureColumns: ColumnDef<SalaryStructure>[] = [
  {
    id: 'employee',
    header: 'Nhân viên',
    cell: ({ row }) => {
      const emp = row.original.employee;
      return emp ? `${emp.fullName} (${emp.employeeCode})` : '\u2014';
    },
  },
  {
    accessorKey: 'baseSalary',
    header: 'Lương cơ bản',
    cell: ({ row }) => (
      <MoneyCell amount={row.original.baseSalary} currency={row.original.currency} />
    ),
  },
  {
    accessorKey: 'payFrequency',
    header: 'Kỳ trả',
    cell: ({ row }) => payFrequencyLabel(row.original.payFrequency),
  },
  {
    accessorKey: 'currency',
    header: 'Tiền tệ',
  },
  {
    accessorKey: 'effectiveFrom',
    header: 'Hiệu lực từ',
  },
  {
    accessorKey: 'isCurrent',
    header: 'Trạng thái',
    cell: ({ row }) => (
      <Badge variant={row.original.isCurrent ? 'default' : 'secondary'}>
        {row.original.isCurrent ? 'Hiện tại' : 'Cũ'}
      </Badge>
    ),
  },
];
