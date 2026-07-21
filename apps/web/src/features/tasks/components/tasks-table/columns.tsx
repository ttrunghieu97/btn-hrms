'use client';

import { formatDateVN } from "@/lib/date";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Column, ColumnDef } from '@tanstack/react-table';
import { ChevronDownIcon, ChevronUpIcon, CaretSortIcon } from '@radix-ui/react-icons';
import { commonUiCopy, taskUiCopy } from '@/lib/app-copy';
import { getTaskStatusConfig, getTaskPriorityConfig } from '../../utils/task-status';
import { getDeadlineInfo } from '../../utils/deadline-progress';
import type { Task } from '../../utils/task-types';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';

function formatDate(value: string | null | undefined, fallback = '') {
  if (!value?.trim()) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return formatDateVN(date);
}

function getInitials(name: string) {
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function SortHeader({ column, title }: { column: Column<Task, unknown>; title: string }) {
  if (!column.getCanSort()) return <div>{title}</div>;
  const sorted = column.getIsSorted();
  return (
    <Button type='button' variant='ghost' className='-ml-2 h-8 px-2 font-medium' onClick={() => column.toggleSorting(sorted === 'asc')}>
      <span>{title}</span>
      {sorted === 'desc' ? <ChevronDownIcon className='text-muted-foreground ml-1 size-4' /> : sorted === 'asc' ? <ChevronUpIcon className='text-muted-foreground ml-1 size-4' /> : <CaretSortIcon className='text-muted-foreground ml-1 size-4' />}
    </Button>
  );
}

export const columns = (
  onRowClick: (task: Task) => void,
  onEdit?: (task: Task) => void,
  onDelete?: (task: Task) => void,
): ColumnDef<Task>[] => [
  {
    id: 'title',
    accessorFn: (row) => row.title,
    header: ({ column }) => <SortHeader column={column} title={taskUiCopy.table.titleLabel} />,
    cell: ({ row }) => (
      <div className='max-w-[300px] flex items-start gap-1.5'>
        {row.original.parentTaskId && (
          <span className="text-primary mt-0.5 font-bold" title={taskUiCopy.table.subtaskTitle}>
            ↳
          </span>
        )}
        <div>
          <span className='font-medium line-clamp-1'>{row.original.title}</span>
          {row.original.description && <span className='text-muted-foreground text-xs line-clamp-1'>{row.original.description}</span>}
        </div>
      </div>
    ),
    meta: { label: taskUiCopy.table.titleLabel, placeholder: taskUiCopy.table.titlePlaceholder, variant: 'text' as const, toolbarOrder: 1 },
    enableColumnFilter: true
  },
  {
    id: 'status',
    accessorFn: (row) => row.status,
    header: ({ column }) => <SortHeader column={column} title={taskUiCopy.table.statusLabel} />,
    cell: ({ row }) => {
      const config = getTaskStatusConfig(row.original.status);
      return <Badge variant={config.variant} className={cn('whitespace-nowrap', config.className)}>{config.label}</Badge>;
    },
    meta: {
      label: taskUiCopy.table.statusLabel, variant: 'multiSelect' as const,
      options: [
        { label: taskUiCopy.table.statusCreated, value: 'created' },
        { label: taskUiCopy.table.statusAssigned, value: 'assigned' },
        { label: taskUiCopy.table.statusInProgress, value: 'in_progress' },
        { label: taskUiCopy.table.statusSubmitted, value: 'submitted' },
        { label: taskUiCopy.table.statusRevision, value: 'revision' },
        { label: taskUiCopy.table.statusDeclined, value: 'declined' },
        { label: taskUiCopy.table.statusCompleted, value: 'completed' },
        { label: taskUiCopy.table.statusCancelled, value: 'cancelled' }
      ],
      toolbarOrder: 2
    },
    enableColumnFilter: true
  },
  {
    id: 'priority',
    accessorFn: (row) => row.priority ?? 'medium',
    header: ({ column }) => <SortHeader column={column} title={taskUiCopy.table.priorityLabel} />,
    cell: ({ row }) => {
      const config = getTaskPriorityConfig(row.original.priority);
      return <span className={cn('text-sm', config.className)}>{config.label}</span>;
    },
    meta: {
      label: taskUiCopy.table.priorityLabel, variant: 'multiSelect' as const,
      options: [
        { label: taskUiCopy.table.priorityLow, value: 'low' },
        { label: taskUiCopy.table.priorityMedium, value: 'medium' },
        { label: taskUiCopy.table.priorityHigh, value: 'high' },
        { label: taskUiCopy.table.priorityUrgent, value: 'urgent' }
      ],
      toolbarOrder: 3
    },
    enableColumnFilter: true
  },
  {
    id: 'assignee',
    accessorFn: (row) => row.assignee?.fullName ?? '',
    header: () => <div>{taskUiCopy.table.assigneeLabel}</div>,
    cell: ({ row }) => {
      const assignee = row.original.assignee;
      if (!assignee) return <span className='text-muted-foreground text-sm'>{taskUiCopy.table.unassigned}</span>;
      return (
        <div className='flex items-center gap-2'>
          <Avatar className='size-7'>
            <AvatarImage src={assignee.avatar ?? undefined} alt={assignee.fullName} />
            <AvatarFallback className='text-[10px] bg-primary/10 text-primary'>{getInitials(assignee.fullName)}</AvatarFallback>
          </Avatar>
          <span className='text-sm truncate max-w-[120px]'>{assignee.fullName}</span>
        </div>
      );
    }
  },
  {
    id: 'deadline',
    accessorFn: (row) => row.dueDate ?? '',
    header: ({ column }) => <SortHeader column={column} title={taskUiCopy.table.dueDateLabel} />,
    cell: ({ row }) => {
      const task = row.original;
      const info = getDeadlineInfo(task.createdAt, task.dueDate, task.completedAt);
      if (!info) return <span className='text-muted-foreground text-sm'>—</span>;
      return (
        <span className={cn('text-xs font-semibold', info.badgeTextColor)}>{info.remainingLabel}</span>
      );
    }
  },
  {
    id: 'createdAt',
    accessorFn: (row) => row.createdAt,
    header: ({ column }) => <SortHeader column={column} title={taskUiCopy.table.createdAtLabel} />,
    cell: ({ row }) => <span className='text-sm text-muted-foreground'>{formatDate(row.original.createdAt)}</span>
  },
  {
    id: 'actions',
    header: () => <span className='sr-only'>{taskUiCopy.table.actionsLabel}</span>,
    cell: ({ row }) => (
      <div className='text-right' role='presentation' onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon' className='size-8'>
              <Icons.ellipsis className='size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='min-w-36'>
            <DropdownMenuItem onClick={() => onRowClick(row.original)}>
              <Icons.eyeOff className='mr-2 size-4' />
              {commonUiCopy.view}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit?.(row.original)}>
              <Icons.edit className='mr-2 size-4' />
              {commonUiCopy.edit}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete?.(row.original)} className='text-destructive'>
              <Icons.trash className='mr-2 size-4' />
              {commonUiCopy.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }
];
