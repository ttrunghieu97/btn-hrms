import React from 'react';

/**
 * Coral HRMS Button Component
 * Recreated from apps/web/src/components/ui/button.tsx
 * Uses design tokens from tokens/colors_and_type.css
 */
export function Button({
  variant = 'default',
  size = 'default',
  isLoading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-opacity-50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

  const variantStyles = {
    default: 'bg-[var(--accent-1)] text-white hover:bg-[var(--accent-1-hover)] shadow-xs focus-visible:ring-[var(--accent-1)]',
    destructive: 'bg-[var(--danger)] text-white hover:opacity-90 shadow-xs focus-visible:ring-[var(--danger)]',
    outline: 'border border-[var(--border-1)] bg-transparent hover:bg-[var(--bg-3)] text-[var(--fg-1)] shadow-xs',
    secondary: 'bg-[var(--bg-3)] text-[var(--fg-1)] hover:opacity-85 shadow-xs',
    ghost: 'hover:bg-[var(--bg-3)] text-[var(--fg-1)]',
    link: 'text-[var(--accent-1)] underline-offset-4 hover:underline p-0 h-auto'
  };

  const sizeStyles = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 px-3 text-xs gap-1.5',
    lg: 'h-10 px-6 text-base',
    icon: 'size-9 p-0'
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.default} ${sizeStyles[size] || sizeStyles.default} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}
