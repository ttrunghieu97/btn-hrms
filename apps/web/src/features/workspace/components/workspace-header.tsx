'use client';

import { useMemo } from 'react';

interface WorkspaceHeaderProps {
  userName?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getTodayDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Workspace greeting header.
 * Pure presentation — no data fetching.
 */
export function WorkspaceHeader({ userName }: WorkspaceHeaderProps) {
  const greeting = useMemo(() => getGreeting(), []);
  const dateStr = useMemo(() => getTodayDate(), []);

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        {greeting}{userName ? `, ${userName}` : ''}
      </h1>
      <p className="text-sm text-muted-foreground">{dateStr}</p>
    </div>
  );
}
