import type { Column, ColumnDef } from '@tanstack/react-table';
import { ChevronDownIcon, ChevronUpIcon, CaretSortIcon } from '@radix-ui/react-icons';
import { formatDateVN } from "@/lib/date";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { commonUiCopy } from '@/lib/app-copy';
import type { ScheduleRow } from '../../api/queries';
import { CellAction } from './cell-action';

function getEmployeeName(row: ScheduleRow) {
  return row.employeeName || row.employeeId;
}

function getInitials(name: string) {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getTextValue(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function formatDate(value: unknown, fallback = '—') {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;
  const date = new Date(value + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return fallback;
  return formatDateVN(date);
}

function formatMinutes(m: number) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h}h${r}p` : `${h}h`;
}

function SortHeader({
  column,
  title
}: {
  column: Column<ScheduleRow, unknown>;
  title: string;
}) {
  if (!column.getCanSort()) return <div>{title}</div>;
  const sorted = column.getIsSorted();
  return (
    <Button type='button' variant='ghost' className='-ml-2 h-8 px-2 font-medium' onClick={() => column.toggleSorting(sorted === 'asc')}>
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

export const columns = (onRowClick: (row: ScheduleRow) => void): ColumnDef<ScheduleRow>[] => [
  {
    id: 'employeeName',
    accessorFn: (row) => getEmployeeName(row),
    header: ({ column }: { column: Column<ScheduleRow, unknown> }) => (
      <SortHeader column={column} title='Nhân viên' />
    ),
    cell: ({ row }) => {
      const name = getEmployeeName(row.original);
      return (
        <div className='flex items-center gap-3'>
          <Avatar className='size-8'>
            <AvatarFallback className='text-xs bg-primary/10 text-primary'>
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <span className='font-medium'>{name}</span>
            <span className='text-muted-foreground text-xs'>{row.original.employeeId}</span>
          </div>
        </div>
      );
    },
    meta: {
      label: 'Nhân viên',
      placeholder: 'Tìm kiếm (tên, mã)...',
      variant: 'text' as const,
      icon: Icons.text,
      toolbarOrder: 1
    },
    enableColumnFilter: true
  },
  {
    id: 'workDate',
    accessorFn: (row) => row.workDate,
    header: ({ column }: { column: Column<ScheduleRow, unknown> }) => (
      <SortHeader column={column} title='Ngày' />
    ),
    cell: ({ row }) => <span className='text-sm'>{formatDate(row.original.workDate)}</span>,
    meta: {
      label: 'Ngày',
      responsivePriority: 'supporting'
    }
  },
  {
    id: 'shiftTemplateName',
    accessorFn: (row) => row.shiftTemplateName || row.shiftTemplateCode,
    header: ({ column }: { column: Column<ScheduleRow, unknown> }) => (
      <SortHeader column={column} title='Ca' />
    ),
    cell: ({ row }) => (
      <div className='flex flex-col'>
        <span className='text-sm font-medium'>{row.original.shiftTemplateName}</span>
        <span className='text-muted-foreground text-xs'>{row.original.shiftTemplateCode}</span>
      </div>
    ),
    meta: {
      label: 'Ca',
      responsivePriority: 'supporting'
    }
  },
  {
    id: 'timeRange',
    accessorFn: (row) => `${row.startTime}-${row.endTime}`,
    header: ({ column }: { column: Column<ScheduleRow, unknown> }) => (
      <SortHeader column={column} title='Giờ' />
    ),
    cell: ({ row }) => (
      <span className='text-sm whitespace-nowrap'>
        {row.original.startTime} - {row.original.endTime}
        {row.original.overnight ? ' (+1)' : ''}
      </span>
    ),
    meta: {
      label: 'Giờ',
      responsivePriority: 'supporting'
    }
  },
  {
    id: 'scheduledMinutes',
    accessorFn: (row) => row.scheduledMinutes,
    header: ({ column }: { column: Column<ScheduleRow, unknown> }) => (
      <SortHeader column={column} title='Thời lượng' />
    ),
    cell: ({ row }) => <span className='text-sm'>{formatMinutes(row.original.scheduledMinutes)}</span>,
    meta: {
      label: 'Thời lượng',
      responsivePriority: 'rich'
    }
  },
  {
    id: 'assignmentStatus',
    accessorFn: (row) => row.assignmentStatus,
    header: ({ column }: { column: Column<ScheduleRow, unknown> }) => (
      <SortHeader column={column} title='Trạng thái' />
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.assignmentStatus === 'published' ? 'default' : 'secondary'} className='text-xs whitespace-nowrap'>
        {row.original.assignmentStatus === 'published' ? 'Đã công bố' : row.original.assignmentStatus === 'planned' ? 'Đã lên kế hoạch' : row.original.assignmentStatus}
      </Badge>
    ),
    meta: {
      label: 'Trạng thái',
      toolbarHidden: true
    }
  },
  {
    id: 'actions',
    header: () => <div>{commonUiCopy.actionsMenu}</div>,
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <CellAction
          data={row.original}
          onView={() => onRowClick(row.original)}
        />
      </div>
    )
  }
];
