import React from 'react';

/**
 * Coral HRMS StatCard Component
 * Recreated from attendance and dashboard metric summaries
 */
export function StatCard({
  title,
  value,
  subtitle,
  badge,
  icon,
  className = ''
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 shadow-2xs ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-medium text-[var(--fg-2)]">
        <span>{title}</span>
        {icon && <span className="text-[var(--fg-3)]">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-[var(--font-mono)] text-2xl font-bold tracking-tight text-[var(--fg-1)]">
          {value}
        </span>
        {badge}
      </div>
      {subtitle && (
        <span className="text-xs text-[var(--fg-3)]">
          {subtitle}
        </span>
      )}
    </div>
  );
}
