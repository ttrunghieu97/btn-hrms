'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import { commonUiCopy, roleUiCopy } from '@/lib/app-copy';
import type { Role } from '../api/service';
import type { Column, ColumnDef } from '@tanstack/react-table';
import { RoleRowActions } from './roles-table-row-actions';

export const roleColumns = (
  onRowClick: (role: Role) => void,
): ColumnDef<Role>[] => [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }: { column: Column<Role, unknown> }) => (
      <DataTableColumnHeader column={column} title={roleUiCopy.nameLabel} />
    ),
    cell: ({ row }) => (
      <div className='flex min-w-0 flex-col'>
        <button
          type='button'
          className='text-left font-medium underline-offset-2 hover:underline'
          onClick={() => onRowClick(row.original)}
        >
          {row.original.name}
        </button>
        <span className='text-muted-foreground text-xs'>
          {row.original.description?.trim() || roleUiCopy.noDescription}
        </span>
      </div>
    ),
    meta: {
      label: roleUiCopy.nameLabel,
      placeholder: roleUiCopy.table.searchPlaceholder,
      variant: 'text' as const,
      icon: Icons.text,
      toolbarOrder: 1,
    },
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    id: 'type',
    accessorFn: (row) => (row.isSystem ? 'system' : 'custom'),
    header: ({ column }: { column: Column<Role, unknown> }) => (
      <DataTableColumnHeader column={column} title={roleUiCopy.table.typeLabel} />
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.isSystem ? 'secondary' : 'outline'}>
        {row.original.isSystem ? roleUiCopy.table.systemType : roleUiCopy.table.customType}
      </Badge>
    ),
    meta: {
      label: roleUiCopy.table.typeLabel,
      variant: 'select' as const,
      options: [
        { label: roleUiCopy.table.systemType, value: 'system' },
        { label: roleUiCopy.table.customType, value: 'custom' },
      ],
      toolbarOrder: 2,
    },
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    id: 'permissions',
    accessorFn: (row) => row.permissions?.length ?? 0,
    header: ({ column }: { column: Column<Role, unknown> }) => (
      <DataTableColumnHeader column={column} title={roleUiCopy.table.permissionsLabel} />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <Icons.shield className='text-muted-foreground h-4 w-4 shrink-0' />
        <span>{row.original.permissions?.length ?? 0}</span>
      </div>
    ),
    enableColumnFilter: false,
    enableSorting: true,
  },
  {
    id: 'description',
    accessorFn: (row) => row.description ?? '',
    header: ({ column }: { column: Column<Role, unknown> }) => (
      <DataTableColumnHeader column={column} title={commonUiCopy.description} />
    ),
    cell: ({ row }) => (
      <div className='text-muted-foreground max-w-md truncate text-sm'>
        {row.original.description?.trim() || '—'}
      </div>
    ),
    meta: {
      label: commonUiCopy.description,
      placeholder: roleUiCopy.table.descriptionSearchPlaceholder,
      variant: 'text' as const,
      icon: Icons.text,
    },
    enableColumnFilter: true,
    enableSorting: false,
  },
  {
    id: 'actions',
    enableSorting: false,
    enableColumnFilter: false,
    cell: ({ row }) => <RoleRowActions role={row.original} />,
  },
];
