'use client';

import type { Column, ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import { shiftUiCopy } from '@/lib/app-copy';
import type { ShiftAssignmentRow } from '../../api/queries';

export function createAssignmentColumns(
  onEdit: (row: ShiftAssignmentRow) => void,
  onCancel: (row: ShiftAssignmentRow) => void
): ColumnDef<ShiftAssignmentRow>[] {
  return [
    {
      id: 'employeeName',
      accessorKey: 'employeeName',
      header: ({ column }: { column: Column<ShiftAssignmentRow, unknown> }) => (
        <DataTableColumnHeader column={column} title={shiftUiCopy.assignments.employeeLabel} />
      ),
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span className='font-medium'>{row.original.employeeName}</span>
          <span className='text-muted-foreground text-xs'>{row.original.employeeId}</span>
        </div>
      ),
      meta: {
        label: shiftUiCopy.assignments.employeeLabel,
        placeholder: shiftUiCopy.assignments.employeeFilterPlaceholder,
        variant: 'text' as const,
        icon: Icons.user
      },
      enableColumnFilter: true
    },
    {
      id: 'shiftTemplateName',
      accessorKey: 'shiftTemplateName',
      header: ({ column }: { column: Column<ShiftAssignmentRow, unknown> }) => (
        <DataTableColumnHeader column={column} title={shiftUiCopy.assignments.appliedShift} />
      ),
      enableColumnFilter: false
    },
    {
      id: 'effectiveFrom',
      accessorKey: 'effectiveFrom',
      header: ({ column }: { column: Column<ShiftAssignmentRow, unknown> }) => (
        <DataTableColumnHeader column={column} title={shiftUiCopy.assignments.effectiveLabel} />
      ),
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span>{shiftUiCopy.assignments.fromPrefix} {row.original.effectiveFrom}</span>
          <span className='text-muted-foreground text-xs'>
            {row.original.effectiveTo
              ? `${shiftUiCopy.assignments.toPrefix} ${row.original.effectiveTo}`
              : shiftUiCopy.assignments.unlimited}
          </span>
        </div>
      ),
      enableColumnFilter: false
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }: { column: Column<ShiftAssignmentRow, unknown> }) => (
        <DataTableColumnHeader column={column} title={shiftUiCopy.assignments.statusLabel} />
      ),
      cell: ({ row }) => <Badge variant='outline'>{row.original.status}</Badge>,
      enableColumnFilter: false
    },
    {
      id: 'actions',
      header: shiftUiCopy.assignments.actionsLabel,
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button
            type='button'
            className='text-sm font-medium underline-offset-4 hover:underline'
            onClick={() => onEdit(row.original)}
          >
            {shiftUiCopy.assignments.editAction}
          </button>
          {row.original.status !== 'cancelled' ? (
            <button
              type='button'
              className='text-destructive text-sm font-medium underline-offset-4 hover:underline'
              onClick={() => onCancel(row.original)}
            >
              {shiftUiCopy.assignments.cancelAction}
            </button>
          ) : null}
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false
    }
  ];
}
