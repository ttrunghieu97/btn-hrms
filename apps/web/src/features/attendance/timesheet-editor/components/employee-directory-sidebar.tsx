'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TimesheetWorkspaceEmployee } from '../types';
import { employeeStatus, initials, statusMap } from '../timesheet-calculations';

export type EmployeeVerificationFilter = 'all' | 'unverified' | 'verified';

interface EmployeeDirectorySidebarProps {
  employees: TimesheetWorkspaceEmployee[];
  totalCount: number;
  unverifiedCount: number;
  verifiedCount: number;
  statusFilter: EmployeeVerificationFilter;
  onStatusFilterChange: (val: EmployeeVerificationFilter) => void;
  selectedId: string;
  search: string;
  onSearchChange: (val: string) => void;
  dept: string;
  onDeptChange: (val: string) => void;
  departments: string[];
  verificationMap: Record<string, 'draft' | 'done'>;
  collapsed: boolean;
  onSelectEmployee: (emp: TimesheetWorkspaceEmployee) => void;
  onEmployeeKeyDown: (event: React.KeyboardEvent, index: number) => void;
}

interface EmployeeDirectoryItemProps {
  employee: TimesheetWorkspaceEmployee;
  index: number;
  isSelected: boolean;
  status: 'verified' | 'unverified' | 'bad';
  onSelectEmployee: (emp: TimesheetWorkspaceEmployee) => void;
  onEmployeeKeyDown: (event: React.KeyboardEvent, index: number) => void;
}

const EmployeeDirectoryItem = React.memo(function EmployeeDirectoryItem({
  employee: e,
  index,
  isSelected,
  status: st,
  onSelectEmployee,
  onEmployeeKeyDown,
}: EmployeeDirectoryItemProps) {
  return (
    <button
      id={`emp-item-${e.id}`}
      type='button'
      onClick={() => onSelectEmployee(e)}
      onKeyDown={(evt) => onEmployeeKeyDown(evt, index)}
      className={cn(
        'group focus-visible:ring-ring relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors outline-none focus-visible:ring-2',
        isSelected
          ? 'bg-accent text-accent-foreground border-l-primary border-l-2 font-medium shadow-2xs'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-l-transparent',
      )}
    >
      <span
        data-slot='avatar'
        className='relative flex size-8 shrink-0 overflow-hidden rounded-full border'
      >
        <span
          data-slot='avatar-fallback'
          className={cn(
            'bg-muted flex size-full items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/5 text-primary',
          )}
        >
          {initials(e.fullName)}
        </span>
      </span>

      <div className='min-w-0 flex-1'>
        <span
          className={cn(
            'block truncate text-xs font-semibold',
            isSelected ? 'text-foreground' : 'text-foreground/90',
          )}
        >
          {e.fullName}
        </span>
        <div className='text-muted-foreground flex items-center gap-1 truncate text-[11px]'>
          <span className='tabular-nums'>{e.employeeCode}</span>
          <span>·</span>
          <span className='truncate'>{e.departmentName ?? 'Chưa phân phòng'}</span>
        </div>
      </div>

      <div className='flex shrink-0 flex-col items-end gap-1'>
        <span className='text-foreground text-xs font-semibold tabular-nums'>
          {e.workingDays}/{e.totalDays}
        </span>
        <StatusBadge status={st} mapping={statusMap} />
      </div>
    </button>
  );
});

export const EmployeeDirectorySidebar = React.memo(function EmployeeDirectorySidebar({
  employees,
  totalCount,
  unverifiedCount,
  verifiedCount,
  statusFilter,
  onStatusFilterChange,
  selectedId,
  search,
  onSearchChange,
  dept,
  onDeptChange,
  departments,
  verificationMap,
  collapsed,
  onSelectEmployee,
  onEmployeeKeyDown,
}: EmployeeDirectorySidebarProps) {
  return (
    <aside
      aria-hidden={collapsed}
      inert={collapsed ? true : undefined}
      className={cn(
        'employee-sidebar-panel bg-card border-border mr-3 flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-xs print:hidden',
        collapsed && 'collapsed',
      )}
    >
      <div className='employee-sidebar-inner flex h-full flex-col'>
        <div className='border-border/60 space-y-2.5 border-b p-3'>
          <div className='flex items-center justify-between'>
            <span className='text-foreground text-xs font-semibold tracking-tight'>
              Danh sách nhân sự
            </span>
            <Badge variant='secondary' className='text-xs font-medium tabular-nums'>
              {employees.length}
            </Badge>
          </div>

          <div className='relative'>
            <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2' />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder='Tìm tên hoặc mã NV…'
              className='bg-background h-8 pr-7 pl-8 text-xs'
            />
            {search && (
              <button
                type='button'
                onClick={() => onSearchChange('')}
                className='text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 p-0.5'
                aria-label='Xóa tìm kiếm'
              >
                <Icons.circleX className='size-3.5' />
              </button>
            )}
          </div>

          <Select value={dept || 'ALL'} onValueChange={(v) => onDeptChange(v === 'ALL' ? '' : v)}>
            <SelectTrigger className='bg-background h-8 w-full text-xs'>
              <SelectValue placeholder='Tất cả phòng ban' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL' className='text-xs'>
                Tất cả phòng ban
              </SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d} className='text-xs'>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div
            role='tablist'
            aria-label='Lọc trạng thái chốt công'
            className='bg-muted/60 grid grid-cols-3 gap-1 rounded-lg p-1 text-[11px]'
          >
            {(
              [
                { id: 'all', label: 'Tất cả', count: totalCount },
                { id: 'unverified', label: 'Chưa chốt', count: unverifiedCount },
                { id: 'verified', label: 'Đã chốt', count: verifiedCount },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type='button'
                  role='tab'
                  aria-selected={active}
                  onClick={() => onStatusFilterChange(tab.id)}
                  className={cn(
                    'flex items-center justify-center gap-1 rounded-md px-1.5 py-1 font-medium transition-colors',
                    active
                      ? 'bg-background text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className='truncate'>{tab.label}</span>
                  <span className='text-[10px] opacity-75 tabular-nums'>({tab.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className='min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto p-2'>
          {employees.map((e, index) => (
            <EmployeeDirectoryItem
              key={e.id}
              employee={e}
              index={index}
              isSelected={e.id === selectedId}
              status={employeeStatus(e, verificationMap)}
              onSelectEmployee={onSelectEmployee}
              onEmployeeKeyDown={onEmployeeKeyDown}
            />
          ))}
          {employees.length === 0 && (
            <p className='text-muted-foreground px-3 py-8 text-center text-xs'>
              Không tìm thấy nhân viên phù hợp
            </p>
          )}
        </div>
      </div>
    </aside>
  );
});
