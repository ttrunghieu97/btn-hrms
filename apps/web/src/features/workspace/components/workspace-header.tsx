'use client';

import { useMemo } from 'react';

interface WorkspaceHeaderProps {
  userName?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function getTodayDate(): string {
  return new Date().toLocaleDateString('vi-VN', {
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
