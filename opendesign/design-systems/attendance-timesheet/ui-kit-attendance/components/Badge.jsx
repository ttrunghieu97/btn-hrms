import React from 'react';

/**
 * shadcn/ui Badge component
 * Variants: default, secondary, outline, ok, warn, danger, info
 */
export function Badge({
  children,
  variant = 'default',
  className = '',
  ...props
}) {
  const base = 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors';

  const variants = {
    default: 'bg-[var(--accent-1)] text-white dark:text-zinc-900',
    secondary: 'bg-[var(--surface-subtle)] text-[var(--fg-2)] border border-transparent',
    outline: 'border border-[var(--border-subtle)] text-[var(--fg-1)] bg-transparent',
    ok: 'border border-[var(--status-ok-border)] bg-[var(--status-ok-bg)] text-[var(--status-ok-text)] font-semibold',
    warn: 'border border-[var(--status-warn-border)] bg-[var(--status-warn-bg)] text-[var(--status-warn-text)] font-semibold',
    danger: 'border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] font-semibold',
    info: 'border border-[var(--status-info-border)] bg-[var(--status-info-bg)] text-[var(--status-info-text)] font-semibold',
  };

  return (
    <span className={`${base} ${variants[variant] || variants.default} ${className}`} {...props}>
      {children}
    </span>
  );
}
