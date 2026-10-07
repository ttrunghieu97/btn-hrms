import React from 'react';

/**
 * Coral HRMS Select Component
 * Recreated from apps/web/src/components/ui/select.tsx
 */
export function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Chọn...',
  className = '',
  ...props
}) {
  return (
    <div className="relative inline-block w-full">
      <select
        value={value}
        onChange={onChange}
        className={`h-9 w-full appearance-none rounded-md border border-[var(--border-2)] bg-[var(--surface-primary)] px-3 pr-8 text-sm text-[var(--fg-1)] shadow-2xs outline-none transition-colors focus-visible:border-[var(--ring)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-1)]/20 cursor-pointer ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[var(--fg-2)]">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
