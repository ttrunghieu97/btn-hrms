import React from 'react';

/**
 * Coral HRMS Card Components
 * Recreated from apps/web/src/components/ui/card.tsx
 * Uses design tokens from tokens/colors_and_type.css
 */
export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-[var(--surface-primary)] text-[var(--fg-1)] flex flex-col rounded-xl border border-[var(--border-subtle)] shadow-xs ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }) {
  return (
    <div
      className={`flex items-start justify-between p-5 pb-3 border-b border-[var(--border-subtle)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }) {
  return (
    <h3
      className={`text-base font-semibold leading-tight text-[var(--fg-1)] ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }) {
  return (
    <p
      className={`text-xs text-[var(--fg-2)] mt-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...props }) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }) {
  return (
    <div
      className={`flex items-center p-5 pt-3 border-t border-[var(--border-subtle)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
