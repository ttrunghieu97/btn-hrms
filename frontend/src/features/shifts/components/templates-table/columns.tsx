'use client';

import type { Column, ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import { shiftUiCopy } from '@/lib/app-copy';
import type { ShiftTemplateRow } from '../../api/queries';

export function createTemplateColumns(
  onEdit: (row: ShiftTemplateRow) => void,
  onArchive: (row: ShiftTemplateRow) => void
): ColumnDef<ShiftTemplateRow>[] {
  return [
    {
      id: 'name',
      accessorFn: (row) => row.name,
      header: ({ column }: { column: Column<ShiftTemplateRow, unknown> }) => (
        <DataTableColumnHeader column={column} title={shiftUiCopy.templates.shiftLabel} />
      ),
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span className='font-medium'>{row.original.name}</span>
          <span className='text-muted-foreground text-xs'>{row.original.code}</span>
        </div>
      ),
      meta: {
        label: shiftUiCopy.templates.shiftLabel,
        placeholder: shiftUiCopy.templates.searchPlaceholder,
        variant: 'text' as const,
        icon: Icons.text
      },
      enableColumnFilter: true
    },
    {
      id: 'time',
      accessorFn: (row) => `${row.startTime}-${row.endTime}`,
      header: ({ column }: { column: Column<ShiftTemplateRow, unknown> }) => (
        <DataTableColumnHeader column={column} title={shiftUiCopy.templates.timeRangeLabel} />
      ),
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span>{row.original.startTime} - {row.original.endTime}</span>
          <span className='text-muted-foreground text-xs'>
            {shiftUiCopy.templates.breakMinutesSuffix(row.original.breakMinutes)}
          </span>
        </div>
      ),
      enableColumnFilter: false
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }: { column: Column<ShiftTemplateRow, unknown> }) => (
        <DataTableColumnHeader column={column} title={shiftUiCopy.templates.statusLabel} />
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        const label =
          status === 'published'
            ? shiftUiCopy.templates.statusPublished
            : status === 'archived'
              ? shiftUiCopy.templates.statusArchived
              : shiftUiCopy.templates.statusDraft;
        return <Badge variant='outline'>{label}</Badge>;
      },
      meta: {
        label: shiftUiCopy.templates.statusLabel,
        variant: 'select' as const,
        options: [
          { label: shiftUiCopy.templates.statusDraft, value: 'draft' },
          { label: shiftUiCopy.templates.statusPublished, value: 'published' },
          { label: shiftUiCopy.templates.statusArchived, value: 'archived' }
        ]
      },
      enableColumnFilter: true
    },
    {
      id: 'flags',
      accessorFn: (row) => (row.overnight ? 'overnight' : 'day'),
      header: shiftUiCopy.templates.notesLabel,
      cell: ({ row }) => (
        <div className='flex flex-wrap gap-1'>
          {row.original.overnight ? <Badge variant='secondary'>{shiftUiCopy.templates.overnightBadge}</Badge> : null}
          {row.original.isActive ? <Badge variant='secondary'>{shiftUiCopy.templates.activeBadge}</Badge> : null}
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false
    },
    {
      id: 'actions',
      header: shiftUiCopy.templates.actionsLabel,
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button
            type='button'
            className='text-sm font-medium underline-offset-4 hover:underline'
            onClick={() => onEdit(row.original)}
          >
            {shiftUiCopy.templates.editAction}
          </button>
          {row.original.status !== 'archived' ? (
            <button
              type='button'
              className='text-destructive text-sm font-medium underline-offset-4 hover:underline'
              onClick={() => onArchive(row.original)}
            >
              {shiftUiCopy.templates.archiveAction}
            </button>
          ) : null}
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false
    }
  ];
}
