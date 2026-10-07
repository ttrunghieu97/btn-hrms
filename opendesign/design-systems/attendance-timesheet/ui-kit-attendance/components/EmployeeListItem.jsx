import React from 'react';
import { Badge } from './Badge';

export function EmployeeListItem({
  employee,
  isSelected,
  onSelect,
}) {
  const initials = employee.fullName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  const isGood = employee.workingDays >= 20;

  return (
    <button
      type="button"
      onClick={() => onSelect(employee)}
      className={`group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors outline-none ${
        isSelected
          ? 'bg-[var(--surface-subtle)] text-[var(--fg-1)] font-medium border-l-2 border-l-[var(--fg-1)]'
          : 'text-[var(--fg-2)] hover:bg-[var(--surface-subtle)] hover:text-[var(--fg-1)] border-l-2 border-l-transparent'
      }`}
    >
      <div
        className={`flex size-7 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold ${
          isSelected
            ? 'bg-[var(--accent-1)] text-white dark:text-zinc-900'
            : 'bg-[var(--surface-subtle)] text-[var(--fg-2)] group-hover:text-[var(--fg-1)]'
        }`}
      >
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-[var(--fg-1)]">
          {employee.fullName}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[var(--fg-3)] truncate font-mono">
          <span>{employee.employeeCode}</span>
          <span>·</span>
          <span className="truncate">{employee.departmentName || 'Chưa gán'}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="font-mono text-[11px] font-semibold text-[var(--fg-1)]">
          {employee.workingDays}/{employee.totalDays}
        </span>
        <Badge variant={isGood ? 'ok' : 'warn'} className="px-1.5 py-0 text-[9px]">
          {isGood ? 'Đủ công' : 'Thiếu công'}
        </Badge>
      </div>
    </button>
  );
}
