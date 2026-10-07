'use client';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { userUiCopy } from '@/lib/app-copy';
import type { User } from '../../api/types';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Icons } from '@/components/icons';
import { CellAction } from './cell-action';

function getInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const columns: ColumnDef<User>[] = [
  {
    id: 'avatar',
    accessorKey: 'avatar',
    enableSorting: false,
    enableColumnFilter: false,
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title="" />
    ),
    cell: ({ row }) => {
      const avatarUrl = row.original.avatar;
      const displayName = row.original.employeeUsername || row.original.username;
      return (
        <Avatar className="h-8 w-8">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={displayName} />
          ) : null}
          <AvatarFallback className="text-xs">{getInitials(displayName)}</AvatarFallback>
        </Avatar>
      );
    },
    meta: { label: '', variant: 'text' as const, icon: Icons.text }
  },
  {
    id: 'name',
    accessorFn: (row) => row.employeeUsername || row.username,
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title={userUiCopy.table.nameLabel} />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.employeeUsername || row.original.username}</span>
        {row.original.email && (
          <span className="text-muted-foreground text-xs">{row.original.email}</span>
        )}
      </div>
    ),
    meta: {
      label: userUiCopy.table.nameLabel,
      placeholder: userUiCopy.table.searchPlaceholder,
      variant: 'text' as const,
      icon: Icons.text
    },
    enableColumnFilter: true
  },
  {
    id: 'roles',
    accessorFn: (row) => {
      if (row.isSuperAdmin) return 'admin';
      if (row.roleIds?.length) return 'has_roles';
      return 'standard';
    },
    enableSorting: false,
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title={userUiCopy.table.assignedRolesLabel} />
    ),
    cell: ({ row }) => {
      const user = row.original;
      if (user.isSuperAdmin) {
        return (
          <Badge variant="default" className="whitespace-nowrap">
            <Icons.shield className="mr-1 h-3 w-3" />
            {userUiCopy.table.systemAdminRole}
          </Badge>
        );
      }
      if (user.roleIds && user.roleIds.length > 0) {
        return (
          <Badge variant="secondary" className="whitespace-nowrap">
            {userUiCopy.table.roleCount(user.roleIds.length)}
          </Badge>
        );
      }
      return (
        <span className="text-muted-foreground text-sm">
          {userUiCopy.table.standardUserRole}
        </span>
      );
    },
    enableColumnFilter: false
  },
  {
    id: 'lastLogin',
    enableSorting: false,
    enableColumnFilter: false,
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title={userUiCopy.table.lastLoginLabel} />
    ),
    cell: () => (
      <span className="text-muted-foreground text-sm">
        {userUiCopy.table.notAvailable}
      </span>
    ),
    meta: { label: userUiCopy.table.lastLoginLabel, variant: 'text' as const, icon: Icons.text }
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
