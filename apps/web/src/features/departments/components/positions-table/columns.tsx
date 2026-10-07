'use client';

import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import { positionUiCopy } from '@/lib/app-copy';
import type { PositionListItemDto } from '@/api/generated/model';
import type { ColumnDef } from '@tanstack/react-table';

export const columns: ColumnDef<PositionListItemDto>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={positionUiCopy.nameLabel} />
    ),
    cell: ({ row, table }) => {
      const onRowClick = (table.options.meta as { onRowClick?: (row: PositionListItemDto) => void })?.onRowClick;
      return (
        <div className='flex items-center gap-2'>
          <Icons.userPen className='text-muted-foreground h-4 w-4 shrink-0' />
          {onRowClick ? (
            <button
              type='button'
              onClick={() => onRowClick(row.original)}
              className='font-medium text-foreground hover:text-primary hover:underline text-left cursor-pointer'
            >
              {row.original.name}
            </button>
          ) : (
            <span className='font-medium'>{row.original.name}</span>
          )}
        </div>
      );
    },
    meta: {
      label: positionUiCopy.nameLabel,
      placeholder: positionUiCopy.table.searchPlaceholder,
      variant: 'text' as const,
      icon: Icons.text
    },
    enableColumnFilter: true
  },
  {
    id: 'employeeCount',
    accessorKey: 'employeeCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={positionUiCopy.table.employeeCountLabel} />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <Icons.people className='text-muted-foreground h-4 w-4 shrink-0' />
        <span className='text-muted-foreground'>{row.original.employeeCount}</span>
      </div>
    )
  }
];
