import React from 'react';

/**
 * Coral HRMS Input Component
 * Recreated from apps/web/src/components/ui/input.tsx
 * Uses design tokens from tokens/colors_and_type.css
 */
export function Input({
  type = 'text',
  isMono = false,
  error = '',
  className = '',
  ...props
}) {
  return (
    <div className="w-full flex flex-col gap-1">
      <input
        type={type}
        className={`flex h-9 w-full rounded-md border border-[var(--border-2)] bg-transparent px-3 py-1 text-sm shadow-2xs transition-colors placeholder:text-[var(--fg-3)] outline-none focus-visible:border-[var(--ring)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-1)]/20 disabled:cursor-not-allowed disabled:opacity-50 ${
          isMono ? 'font-[var(--font-mono)]' : 'font-[var(--font-sans)]'
        } ${
          error ? 'border-[var(--danger)] focus-visible:ring-[var(--danger)]/20' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
    </div>
  );
}
