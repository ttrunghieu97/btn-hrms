'use client';

import { Icons } from '@/components/icons';
import { useTheme } from '@/components/themes/theme-provider';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { appShellCopy } from '@/locales/vi/system-ui';
import * as React from 'react';

function applyThemeTransition(apply: () => void) {
  const html = document.documentElement;
  html.classList.add('theme-micro-transition');
  apply();
  setTimeout(() => html.classList.remove('theme-micro-transition'), 120);
}

export function SidebarThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const isDark = resolvedTheme === 'dark';
  const id = React.useId();

  const handleLightClick = React.useCallback(
    () => applyThemeTransition(() => setTheme('light')),
    [setTheme]
  );
  const handleDarkClick = React.useCallback(
    () => applyThemeTransition(() => setTheme('dark')),
    [setTheme]
  );
  const handleSwitchChange = React.useCallback(
    (checked: boolean) => applyThemeTransition(() => setTheme(checked ? 'dark' : 'light')),
    [setTheme]
  );

  if (isCollapsed) {
    return (
      <SidebarMenuButton
        tooltip={appShellCopy.toggleTheme}
        onClick={isDark ? handleLightClick : handleDarkClick}
      >
        {isDark ? (
          <Icons.moon className='size-4' />
        ) : (
          <Icons.sun className='size-4' />
        )}
      </SidebarMenuButton>
    );
  }

  return (
    <div
      className='group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      data-state={isDark ? 'checked' : 'unchecked'}
    >
      <span className='flex-1 text-sm'>{appShellCopy.toggleTheme}</span>
      <span
        id={`${id}-light`}
        className='group-data-[state=checked]:text-muted-foreground/70 cursor-pointer text-sm font-medium hover:text-foreground transition-colors'
        onClick={handleLightClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLightClick(); }}
        role='button'
        tabIndex={0}
        aria-label={appShellCopy.themeLight}
      >
        <Icons.sun className='size-4' />
      </span>
      <Switch
        id={id}
        checked={isDark}
        onCheckedChange={handleSwitchChange}
        aria-labelledby={`${id}-dark ${id}-light`}
        aria-label={appShellCopy.toggleTheme}
      />
      <span
        id={`${id}-dark`}
        className='group-data-[state=unchecked]:text-muted-foreground/70 cursor-pointer text-sm font-medium hover:text-foreground transition-colors'
        onClick={handleDarkClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDarkClick(); }}
        role='button'
        tabIndex={0}
        aria-label={appShellCopy.themeDark}
      >
        <Icons.moon className='size-4' />
      </span>
    </div>
  );
}
