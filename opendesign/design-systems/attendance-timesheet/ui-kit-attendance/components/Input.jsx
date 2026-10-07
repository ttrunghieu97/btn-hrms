import React from 'react';

export function Input({ className = '', type = 'text', ...props }) {
  return (
    <input
      type={type}
      className={`flex h-8 w-full rounded-md border border-[var(--border-subtle)] bg-transparent px-2.5 py-1 text-xs text-[var(--fg-1)] placeholder:text-[var(--fg-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--fg-1)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${className}`}
      {...props}
    />
  );
}
