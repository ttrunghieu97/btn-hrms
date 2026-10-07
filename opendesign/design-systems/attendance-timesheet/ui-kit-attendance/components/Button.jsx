import React from 'react';

/**
 * shadcn/ui Button component
 * Variants: default (stark black/white), outline, ghost, secondary, destructive
 */
export function Button({
  children,
  variant = 'default',
  size = 'default',
  className = '',
  isLoading = false,
  disabled = false,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none';
  
  const variants = {
    default: 'bg-[var(--accent-1)] text-white dark:text-zinc-950 hover:bg-[var(--accent-1-hover)] shadow-xs',
    outline: 'border border-[var(--border-subtle)] bg-transparent hover:bg-[var(--surface-subtle)] text-[var(--fg-1)]',
    secondary: 'bg-[var(--surface-subtle)] text-[var(--fg-1)] hover:bg-[var(--border-subtle)]',
    ghost: 'hover:bg-[var(--surface-subtle)] text-[var(--fg-1)]',
    destructive: 'bg-[var(--status-danger)] text-white hover:opacity-90 shadow-xs',
  };

  const sizes = {
    sm: 'h-7 px-2.5 text-xs gap-1.5',
    default: 'h-8 px-3 text-xs gap-2',
    lg: 'h-9 px-4 text-sm gap-2',
    icon: 'size-8 p-0',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
      ) : null}
      {children}
    </button>
  );
}
