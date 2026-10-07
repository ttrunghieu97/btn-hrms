import React from 'react';
import { Button } from './Button';

/**
 * Coral HRMS Drawer / Modal Component
 * Recreated from attendance timekeeping edit drawer & dialogs
 */
export function Drawer({
  isOpen = false,
  onClose,
  title,
  subtitle,
  children,
  footer
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      {/* Slide-over panel */}
      <div className="relative z-10 w-full max-w-md bg-[var(--surface-primary)] border-l border-[var(--border-subtle)] shadow-xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-base font-semibold text-[var(--fg-1)]">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--fg-2)] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--bg-3)] cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {children}
        </div>
        {footer && (
          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-inset)] flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
