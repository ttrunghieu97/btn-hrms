'use client';

import * as React from 'react';
import type { Column, ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { ChevronDownIcon, ChevronUpIcon, CaretSortIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import { employeeUiCopy } from '@/lib/app-copy';

export type PresenceStatus = 'ACTIVE' | 'BREAK' | 'UPCOMING' | 'OFF_DUTY' | 'LEAVE' | 'ABSENT';

const STATUS_STYLE: Record<PresenceStatus, { label: string; dotClass: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }> = {
  ACTIVE: {
    label: employeeUiCopy.attendance.presence.active,
    dotClass: 'bg-emerald-500 ring-emerald-500/20 animate-pulse',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    icon: Icons.check,
  },
  BREAK: {
    label: employeeUiCopy.attendance.presence.break,
    dotClass: 'bg-amber-500 ring-amber-500/20',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
    icon: Icons.clock,
  },
  UPCOMING: {
    label: employeeUiCopy.attendance.presence.upcoming,
    dotClass: 'bg-blue-500 ring-blue-500/20',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
    icon: Icons.calendar,
  },
  ABSENT: {
    label: employeeUiCopy.attendance.presence.absent,
    dotClass: 'bg-rose-500 ring-rose-500/20',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300',
    icon: Icons.alertCircle,
  },
  LEAVE: {
    label: employeeUiCopy.attendance.presence.leave,
    dotClass: 'bg-purple-500 ring-purple-500/20',
    badgeClass: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300',
    icon: Icons.calendar,
  },
  OFF_DUTY: {
    label: employeeUiCopy.attendance.presence.offDuty,
    dotClass: 'bg-slate-400 ring-slate-400/20',
    badgeClass: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
    icon: Icons.clock,
  },
};

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

export interface PresenceItem {
  id: string;
  fullName: string;
  avatarUrl?: string;
  employeeCode?: string;
  position?: string;
  departmentName?: string;
  status: PresenceStatus;
  checkInAt?: string;
  workingDurationSeconds: number;
  shiftName?: string;
}

const statusAccessor = (row: PresenceItem) => STATUS_STYLE[row.status]?.label ?? '';

export function StatusBadge({ status }: { status: PresenceStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.OFF_DUTY;
  const Icon = s.icon;
  return (
    <Badge className={cn('gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border shadow-sm transition-all duration-300 hover:shadow-md', s.badgeClass)}>
      <Icon className='size-3.5 shrink-0' />
      <span>{s.label}</span>
    </Badge>
  );
}

interface SortHeaderProps {
  column: Column<PresenceItem, unknown>;
  title: string;
}

function SortHeader({ column, title }: SortHeaderProps) {
  const isSorted = column.getIsSorted();
  const Icon = isSorted === 'desc' ? ChevronDownIcon : isSorted === 'asc' ? ChevronUpIcon : CaretSortIcon;

  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className='-ml-3 h-8 text-xs font-semibold text-muted-foreground hover:text-foreground'
    >
      <span>{title}</span>
      <Icon className='ml-1 size-3.5 text-muted-foreground/70' />
    </Button>
  );
}

export const presenceColumns: ColumnDef<PresenceItem>[] = [
  {
    id: 'fullName',
    accessorFn: (row) => `${row.employeeCode || ''} ${row.fullName}`,
    header: ({ column }) => <SortHeader column={column} title={employeeUiCopy.attendance.presence.personnel} />,
    cell: ({ row }) => {
      const initials = row.original.fullName.split(' ').pop()?.slice(0, 2).toUpperCase() ?? 'NV';
      const dotClass = STATUS_STYLE[row.original.status]?.dotClass ?? STATUS_STYLE.OFF_DUTY.dotClass;
      return (
        <div className='flex items-center gap-3 min-w-0'>
          <div className='relative shrink-0'>
            <Avatar className='size-8 border border-border/40 shadow-sm'>
              <AvatarFallback className='text-xs font-medium bg-muted/60 text-muted-foreground'>{initials}</AvatarFallback>
            </Avatar>
            <span className={cn('absolute -bottom-0.5 -right-0.5 block size-2.5 rounded-full ring-2 ring-background', dotClass)} />
          </div>
          <span className='font-semibold text-foreground truncate text-sm'>{row.original.fullName}</span>
        </div>
      );
    },
    meta: { label: employeeUiCopy.attendance.presence.personnel, placeholder: employeeUiCopy.attendance.presence.findPlaceholder, variant: 'text' as const, icon: Icons.text, toolbarOrder: 1 },
    enableColumnFilter: true,
  },
  {
    id: 'departmentName',
    accessorFn: (row) => row.departmentName ?? '',
    header: ({ column }) => <SortHeader column={column} title={employeeUiCopy.attendance.presence.departmentAndPosition} />,
    cell: ({ row }) => (
      <div className='flex flex-col min-w-0'>
        <span className='font-medium text-foreground text-xs truncate'>{row.original.position || employeeUiCopy.attendance.presence.fallbackPosition}</span>
        <span className='text-muted-foreground text-[10px] truncate mt-0.5'>{row.original.departmentName || employeeUiCopy.attendance.presence.fallbackDepartment}</span>
      </div>
    ),
    meta: { label: employeeUiCopy.attendance.presence.department, variant: 'multiSelect' as const, options: [], toolbarOrder: 1.1, responsivePriority: 'supporting' as const },
    enableColumnFilter: true,
  },
  {
    id: 'status',
    accessorFn: statusAccessor,
    header: ({ column }) => <SortHeader column={column} title={employeeUiCopy.attendance.presence.status} />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    meta: { label: employeeUiCopy.attendance.presence.status, toolbarHidden: true },
  },
  {
    id: 'checkInAt',
    header: () => <span className='text-left'>{employeeUiCopy.attendance.presence.checkInTime}</span>,
    cell: ({ row }) => {
      const show = row.original.status === 'ACTIVE' || row.original.status === 'BREAK';
      return (
        <span className='text-xs font-medium'>
          {show ? (
            <span className='inline-flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded text-muted-foreground'>
              <Icons.clock className='size-3 text-muted-foreground/80' />
              {formatTime(row.original.checkInAt)}
            </span>
          ) : (
            <span className='text-muted-foreground/60'>--:--</span>
          )}
        </span>
      );
    },
    enableSorting: false,
    meta: { label: employeeUiCopy.attendance.presence.checkInTime, responsivePriority: 'supporting' as const },
  },
  {
    id: 'workingDurationSeconds',
    header: () => <span className='text-left'>{employeeUiCopy.attendance.presence.totalWorkHours}</span>,
    cell: ({ row }) => {
      const show = row.original.status === 'ACTIVE' || row.original.status === 'BREAK';
      return (
        <span className='text-xs font-semibold'>
          {show ? (
            <span className='text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30'>
              {formatDuration(row.original.workingDurationSeconds)}
            </span>
          ) : (
            <span className='text-muted-foreground/60'>--</span>
          )}
        </span>
      );
    },
    enableSorting: false,
    meta: { label: employeeUiCopy.attendance.presence.totalWorkHours, responsivePriority: 'supporting' as const },
  },
  {
    id: 'shiftName',
    header: () => <span className='text-left'>{employeeUiCopy.attendance.presence.registeredShift}</span>,
    cell: ({ row }) => (
      <span className='text-xs text-muted-foreground font-medium'>
        {row.original.shiftName ? <span className='text-foreground'>{row.original.shiftName}</span> : <span className='text-muted-foreground/50 italic'>{employeeUiCopy.attendance.presence.noShift}</span>}
      </span>
    ),
    enableSorting: false,
    meta: { label: employeeUiCopy.attendance.presence.registeredShift, responsivePriority: 'rich' as const },
  },
];
