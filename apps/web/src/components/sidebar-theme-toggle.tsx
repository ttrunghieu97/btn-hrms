'use client';

import { Icons } from '@/components/icons';
import { useTheme } from '@/components/themes/theme-provider';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { appShellCopy } from '@/locales/vi/system-ui';
import { cn } from '@/lib/utils';
import * as React from 'react';

export function SidebarThemeToggle() {
  const { theme = 'system', setTheme, resolvedTheme } = useTheme();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const isDark = resolvedTheme === 'dark';

  const handleCycleMode = React.useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  if (isCollapsed) {
    return (
      <SidebarMenuButton
        tooltip={appShellCopy.toggleTheme}
        aria-label={isDark ? appShellCopy.themeLight : appShellCopy.themeDark}
        onClick={handleCycleMode}
      >
        {isDark ? (
          <Icons.moon className='size-4' />
        ) : (
          <Icons.sun className='size-4' />
        )}
      </SidebarMenuButton>
    );
  }

  const options = [
    { value: 'light', label: appShellCopy.themeLight, icon: Icons.sun },
    { value: 'system', label: appShellCopy.themeSystem, icon: Icons.laptop },
    { value: 'dark', label: appShellCopy.themeDark, icon: Icons.moon },
  ] as const;

  return (
    <div className='flex items-center justify-between gap-2 rounded-md px-2 py-1.5'>
      <span className='text-sm text-sidebar-foreground/80'>{appShellCopy.toggleTheme}</span>
      <div
        role='group'
        aria-label={appShellCopy.toggleTheme}
        className='inline-flex items-center rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-0.5'
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              type='button'
              title={opt.label}
              aria-label={opt.label}
              aria-pressed={isActive}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'inline-flex size-6 items-center justify-center rounded-md text-xs transition-colors',
                isActive
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className='size-3.5' />
            </button>
          );
        })}
      </div>
    </div>
  );
}
