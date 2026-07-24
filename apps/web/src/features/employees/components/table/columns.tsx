import { EmployeeStatusBadge } from '../display/employee-status-badge';
import { formatDateVN } from "@/lib/date";
import type { EmployeeResponseDto } from '@/api/generated/model';
import { Icons } from '@/components/icons';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Column, ColumnDef } from '@tanstack/react-table';
import { ChevronDownIcon, ChevronUpIcon, CaretSortIcon } from '@radix-ui/react-icons';
import { extractProtectedAssetUrl } from '@/lib/asset-url';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { getSmartStatus } from '../../utils/employee-status';

function getEmployeeName(employee: EmployeeResponseDto) {
  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim();
  return fullName || employee.username;
}

function getInitials(name: string) {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getTextValue(value: unknown, fallback: string = commonUiCopy.notAvailable) {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function formatDate(value: unknown, fallback: string = commonUiCopy.notAvailable) {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return formatDateVN(date);
}

function SortHeader({
  column,
  title
}: {
  column: Column<EmployeeResponseDto, unknown>;
  title: string;
}) {
  if (!column.getCanSort()) {
    return <div>{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      type='button'
      variant='ghost'
      className='-ml-2 h-8 px-2 font-medium'
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      <span>{title}</span>
      {sorted === 'desc' ? (
        <ChevronDownIcon className='text-muted-foreground ml-1 size-4' />
      ) : sorted === 'asc' ? (
        <ChevronUpIcon className='text-muted-foreground ml-1 size-4' />
      ) : (
        <CaretSortIcon className='text-muted-foreground ml-1 size-4' />
      )}
    </Button>
  );
}

export const columns = (onRowClick?: (employee: EmployeeResponseDto) => void): ColumnDef<EmployeeResponseDto>[] => [
  {
    id: 'name',
    accessorFn: (row) => getEmployeeName(row),
    header: ({ column }: { column: Column<EmployeeResponseDto, unknown> }) => (
      <SortHeader column={column} title={employeeUiCopy.table.name} />
    ),
    cell: ({ row }) => {
      const name = getEmployeeName(row.original);
      return (
        <Link
          href={`/employees/${row.original.id}`}
          className='flex items-center gap-3 group/employee-link w-fit'
        >
          <Avatar className='size-8'>
            <AvatarImage src={extractProtectedAssetUrl(row.original.avatar) || ''} alt={name} loading='lazy' />
            <AvatarFallback className='text-xs bg-primary/10 text-primary'>
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <span className='font-medium text-foreground group-hover/employee-link:text-primary group-hover/employee-link:underline transition-colors'>
              {name}
            </span>
            <span className='text-muted-foreground text-xs'>{row.original.email}</span>
          </div>
        </Link>
      );
    },
    meta: {
      label: employeeUiCopy.table.name,
      placeholder: employeeUiCopy.table.searchNameCodePhone,
      variant: 'text' as const,
      icon: Icons.text,
      toolbarOrder: 1
    },
    enableColumnFilter: true
  },
  {
    id: 'employeeCode',
    accessorFn: (row) => getTextValue(row.employeeCode, ''),
    header: ({ column }: { column: Column<EmployeeResponseDto, unknown> }) => (
      <SortHeader column={column} title={employeeUiCopy.labels.employeeCode} />
    ),
    cell: ({ row }) => <span className='text-sm'>{getTextValue(row.original.employeeCode)}</span>,
    meta: {
      label: employeeUiCopy.labels.employeeCode,
      responsivePriority: 'supporting'
    }
  },
  {
    id: 'department',
    accessorFn: (row) => row.department?.name ?? '',
    header: ({ column }: { column: Column<EmployeeResponseDto, unknown> }) => (
      <SortHeader column={column} title={employeeUiCopy.departmentLabel} />
    ),
    cell: ({ row }) => (
      <span className='text-sm'>
        {row.original.department?.name ?? employeeUiCopy.table.departmentUnassigned}
      </span>
    ),
    meta: {
      label: employeeUiCopy.departmentLabel,
      variant: 'multiSelect' as const,
      options: [],
      toolbarOrder: 1.1,
      responsivePriority: 'supporting'
    },
    enableColumnFilter: true
  },
  {
    id: 'username',
    accessorFn: (row) => row.username,
    header: ({ column }: { column: Column<EmployeeResponseDto, unknown> }) => (
      <SortHeader column={column} title={employeeUiCopy.table.usernameLabel} />
    ),
    cell: ({ row }) => <span>{row.original.username}</span>,
    meta: {
      label: employeeUiCopy.table.usernameLabel,
      responsivePriority: 'rich'
    }
  },
  {
    id: 'phoneNumber',
    accessorFn: (row) => getTextValue(row.phoneNumber, ''),
    header: ({ column }: { column: Column<EmployeeResponseDto, unknown> }) => (
      <SortHeader column={column} title={employeeUiCopy.fields.phoneNumber} />
    ),
    cell: ({ row }) => <span className='text-sm'>{getTextValue(row.original.phoneNumber)}</span>,
    meta: {
      label: employeeUiCopy.fields.phoneNumber,
      responsivePriority: 'supporting'
    }
  },
  {
    id: 'position',
    accessorFn: (row) => getTextValue(row.position?.name, ''),
    header: ({ column }: { column: Column<EmployeeResponseDto, unknown> }) => (
      <SortHeader column={column} title={employeeUiCopy.positionLabel} />
    ),
    cell: ({ row }) => <span className='text-sm'>{getTextValue(row.original.position?.name)}</span>,
    meta: {
      label: employeeUiCopy.positionLabel,
      responsivePriority: 'supporting'
    }
  },
  {
    id: 'startDate',
    accessorFn: (row) => (typeof row.startDate === 'string' ? row.startDate : ''),
    header: ({ column }: { column: Column<EmployeeResponseDto, unknown> }) => (
      <SortHeader column={column} title={employeeUiCopy.labels.startDate} />
    ),
    cell: ({ row }) => <span className='text-sm'>{formatDate(row.original.startDate)}</span>,
    meta: {
      label: employeeUiCopy.labels.startDate,
      responsivePriority: 'supporting'
    }
  },
  {
    id: 'endDate',
    accessorFn: (row) => (typeof row.endDate === 'string' ? row.endDate : ''),
    header: ({ column }: { column: Column<EmployeeResponseDto, unknown> }) => (
      <SortHeader column={column} title={employeeUiCopy.labels.endDate} />
    ),
    cell: ({ row }) => <span className='text-sm'>{formatDate(row.original.endDate)}</span>,
    meta: {
      label: employeeUiCopy.labels.endDate,
      responsivePriority: 'rich'
    }
  },
  {
    id: 'status',
    accessorFn: (row) =>
      getSmartStatus({ status: row.status as string | null, contractType: row.contractType as string | null, contractStatus: row.contractStatus as string | null })
        .label,
    header: ({ column }: { column: Column<EmployeeResponseDto, unknown> }) => (
      <SortHeader column={column} title={employeeUiCopy.statusLabel} />
    ),
    cell: ({ row }) => {
      const status = getSmartStatus({
        status: row.original.status as string | null,
        contractType: row.original.contractType as string | null,
        contractStatus: row.original.contractStatus as string | null
      });

      return (
        <EmployeeStatusBadge status={status.kind} />
      );
    },
    meta: {
      label: employeeUiCopy.statusLabel,
      toolbarHidden: true
    }
  },
  {
    id: 'updatedAt',
    accessorFn: (row) => row.updatedAt,
    header: ({ column }: { column: Column<EmployeeResponseDto, unknown> }) => (
      <SortHeader column={column} title={employeeUiCopy.table.updatedAt} />
    ),
    cell: ({ row }) => <span className='text-sm'>{formatDate(row.original.updatedAt)}</span>,
    meta: {
      label: employeeUiCopy.table.updatedAt,
      responsivePriority: 'rich'
    }
  },
];
