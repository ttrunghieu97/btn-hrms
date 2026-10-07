import React from 'react';

/**
 * Coral HRMS Badge Component
 * Recreated from apps/web/src/components/ui/badge.tsx & status-badge.tsx
 * Uses design tokens from tokens/colors_and_type.css
 */
export function Badge({
  variant = 'default',
  className = '',
  children,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap transition-colors gap-1';

  const variantStyles = {
    default: 'border-transparent bg-[var(--accent-1)] text-white',
    secondary: 'border-transparent bg-[var(--bg-3)] text-[var(--fg-1)]',
    destructive: 'border-transparent bg-[var(--danger)] text-white',
    outline: 'border-[var(--border-1)] text-[var(--fg-1)] bg-transparent',
    success: 'border-[var(--status-ok)]/20 bg-[var(--status-ok-bg)] text-[var(--status-ok-text)] dark:text-[var(--status-ok)]',
    warning: 'border-[var(--status-warn)]/20 bg-[var(--status-warn-bg)] text-[var(--status-warn-text)] dark:text-[var(--status-warn)]',
    info: 'border-[var(--status-info)]/20 bg-[var(--status-info-bg)] text-[var(--status-info-text)] dark:text-[var(--status-info)]',
    bad: 'border-[var(--status-bad)]/20 bg-[var(--status-bad-bg)] text-[var(--status-bad-text)] dark:text-[var(--status-bad)]',
    neutral: 'border-transparent bg-[var(--bg-inset)] text-[var(--fg-2)]'
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.default} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className = '' }) {
  const statusMap = {
    FULL: { label: 'Đủ công', variant: 'success' },
    APPROVED: { label: 'Đã duyệt', variant: 'success' },
    LOCKED: { label: 'Đã chốt', variant: 'default' },
    PARTIAL: { label: 'Thiếu giờ', variant: 'warning' },
    PENDING: { label: 'Chờ duyệt', variant: 'warning' },
    LATE: { label: 'Đi trễ', variant: 'warning' },
    ABSENT: { label: 'Vắng mặt', variant: 'bad' },
    REJECTED: { label: 'Từ chối', variant: 'bad' },
    HOLIDAY: { label: 'Nghỉ lễ', variant: 'info' },
    LEAVE: { label: 'Nghỉ phép', variant: 'info' },
    OVERTIME: { label: 'OT', variant: 'info' }
  };

  const item = statusMap[status] || { label: status || 'Không rõ', variant: 'outline' };

  return (
    <Badge variant={item.variant} className={className}>
      {item.label}
    </Badge>
  );
}
