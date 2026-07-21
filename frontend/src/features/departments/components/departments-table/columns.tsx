'use client';

import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import { departmentUiCopy } from '@/lib/app-copy';
import type { ColumnDef } from '@tanstack/react-table';

import type { DepartmentRow } from '../../queries/department-queries';

export const columns: ColumnDef<DepartmentRow>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={departmentUiCopy.nameLabel} />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <Icons.department className='text-muted-foreground h-4 w-4 shrink-0' />
        <span className='font-medium'>{row.original.name}</span>
      </div>
    ),
    meta: {
      label: departmentUiCopy.nameLabel,
      placeholder: departmentUiCopy.table.searchPlaceholder,
      variant: 'text' as const,
      icon: Icons.text
    },
    enableColumnFilter: true
  },
  {
    id: 'employeeCount',
    accessorKey: 'employeeCount',
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={departmentUiCopy.table.employeeCountLabel} />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5'>
        <Icons.people className='text-muted-foreground h-4 w-4 shrink-0' />
        <span>{row.original.employeeCount}</span>
      </div>
    ),
    enableColumnFilter: false
  }
];
