import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--fg-1)] shadow-2xs overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-3 border-b border-[var(--border-subtle)] ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-3 ${className}`} {...props}>
      {children}
    </div>
  );
}
