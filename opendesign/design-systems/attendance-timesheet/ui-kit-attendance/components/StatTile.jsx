import React from 'react';

export function StatTile({
  label,
  value,
  sublabel,
  details,
  isHero = false,
  badgeText = null,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col justify-between p-3 min-w-0 transition-colors ${
        isHero
          ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950'
          : 'bg-[var(--surface-card)] text-[var(--fg-1)]'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-medium tracking-tight ${isHero ? 'text-zinc-300 dark:text-zinc-700' : 'text-[var(--fg-2)]'}`}>
          {label}
        </span>
        {badgeText && (
          <span className={`text-[9px] font-mono px-1 py-0.5 rounded border ${
            isHero ? 'border-zinc-700 text-zinc-300' : 'border-[var(--border-subtle)] text-[var(--fg-2)]'
          }`}>
            {badgeText}
          </span>
        )}
      </div>

      <div className="my-1.5 flex items-baseline gap-1.5">
        <span className={`font-mono text-lg font-bold tracking-tight ${isHero ? 'text-white dark:text-zinc-950' : 'text-[var(--fg-1)]'}`}>
          {value}
        </span>
        {sublabel && (
          <span className={`text-xs font-mono ${isHero ? 'text-zinc-400 dark:text-zinc-600' : 'text-[var(--fg-3)]'}`}>
            {sublabel}
          </span>
        )}
      </div>

      {details && (
        <div className={`pt-1.5 border-t text-[11px] font-mono flex items-center justify-between ${
          isHero ? 'border-zinc-800 text-zinc-400 dark:border-zinc-200 dark:text-zinc-600' : 'border-[var(--border-subtle)] text-[var(--fg-2)]'
        }`}>
          {details}
        </div>
      )}
    </div>
  );
}
