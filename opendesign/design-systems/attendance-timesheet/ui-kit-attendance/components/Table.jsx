import React from 'react';

export function Table({ children, className = '', ...props }) {
  return (
    <div className="w-full overflow-auto">
      <table className={`w-full caption-bottom text-xs border-collapse ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '', ...props }) {
  return <thead className={`border-b border-[var(--border-subtle)] bg-[var(--surface-header)] ${className}`} {...props}>{children}</thead>;
}

export function TableBody({ children, className = '', ...props }) {
  return <tbody className={`divide-y divide-[var(--border-subtle)] ${className}`} {...props}>{children}</tbody>;
}

export function TableRow({ children, className = '', isHighlighted = false, ...props }) {
  return (
    <tr
      className={`transition-colors hover:bg-[var(--surface-subtle)] ${
        isHighlighted ? 'bg-zinc-50 dark:bg-zinc-900/60' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '', ...props }) {
  return (
    <th
      className={`h-8 px-2 text-center align-middle font-medium text-[var(--fg-2)] text-[11px] border-r border-[var(--border-subtle)] last:border-r-0 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td
      className={`p-1.5 align-middle text-[var(--fg-1)] text-xs border-r border-[var(--border-subtle)] last:border-r-0 ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}
