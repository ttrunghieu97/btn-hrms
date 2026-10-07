import React from 'react';

/**
 * Coral HRMS SidebarBrand Component
 * Recreated from apps/web/src/components/sidebar-brand.tsx
 */
export function SidebarBrand({ isCollapsed = false, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-3 p-3.5 border-b border-[var(--border-subtle)] cursor-pointer select-none transition-colors hover:bg-[var(--bg-3)]/50 ${
        isCollapsed ? 'justify-center px-2' : ''
      }`}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-1)]/10 border border-[var(--accent-1)]/20 overflow-hidden">
        <img
          src="../assets/logos/logo-vang.png"
          alt="BTN"
          className="size-5 object-contain"
        />
      </div>
      {!isCollapsed && (
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-[var(--fg-1)]">
            BTN HRMS
          </span>
          <span className="truncate text-[10px] font-medium tracking-wider uppercase text-[var(--fg-3)]">
            Bach Thao Ngan
          </span>
        </div>
      )}
    </div>
  );
}
