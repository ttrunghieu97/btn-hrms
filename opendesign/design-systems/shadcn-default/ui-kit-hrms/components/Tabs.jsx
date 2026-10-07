import React, { useState } from 'react';

/**
 * Coral HRMS Tabs Component
 * Recreated from apps/web/src/components/ui/tabs.tsx
 */
export function Tabs({ defaultValue, children, className = '' }) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, { activeTab, setActiveTab });
      })}
    </div>
  );
}

export function TabsList({ activeTab, setActiveTab, children, className = '' }) {
  return (
    <div className={`inline-flex h-9 w-fit items-center justify-center rounded-lg bg-[var(--bg-inset)] p-1 text-[var(--fg-2)] border border-[var(--border-subtle)] ${className}`}>
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, { activeTab, setActiveTab });
      })}
    </div>
  );
}

export function TabsTrigger({ value, activeTab, setActiveTab, children, className = '' }) {
  const isActive = activeTab === value;
  return (
    <button
      type="button"
      onClick={() => setActiveTab && setActiveTab(value)}
      className={`inline-flex items-center justify-center rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
        isActive
          ? 'bg-[var(--surface-primary)] text-[var(--fg-1)] shadow-2xs font-semibold'
          : 'text-[var(--fg-2)] hover:text-[var(--fg-1)]'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, activeTab, children, className = '' }) {
  if (activeTab !== value) return null;
  return <div className={`outline-none ${className}`}>{children}</div>;
}
