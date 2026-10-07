import React from 'react';

/**
 * Coral HRMS Dense Table Component
 * Recreated from apps/web/src/components/ui/table.tsx
 * Optimized for dense HR tables (42-44px rows, mono numerals)
 */
export function Table({ className = '', children, ...props }) {
  return (
    <div className="relative w-full overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      <table className={`w-full caption-bottom text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className = '', children, ...props }) {
  return (
    <thead className={`bg-[var(--bg-inset)] border-b border-[var(--border-subtle)] ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className = '', children, ...props }) {
  return (
    <tbody className={`divide-y divide-[var(--border-subtle)] ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className = '', isSunday = false, isSaturday = false, children, ...props }) {
  let weekendClass = '';
  if (isSunday) weekendClass = 'bg-[var(--sun-bg)]';
  else if (isSaturday) weekendClass = 'bg-[var(--sat-bg)]';

  return (
    <tr
      className={`h-11 transition-colors hover:bg-[var(--bg-3)]/60 ${weekendClass} ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className = '', align = 'left', children, ...props }) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      className={`h-10 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--fg-2)] select-none ${alignClass} ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className = '', isMono = false, align = 'left', children, ...props }) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <td
      className={`px-3 py-2.5 text-sm align-middle whitespace-nowrap text-[var(--fg-1)] ${alignClass} ${
        isMono ? 'font-[var(--font-mono)]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}
