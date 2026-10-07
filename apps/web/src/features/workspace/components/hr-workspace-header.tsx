'use client';

import { useMemo } from 'react';

interface HrWorkspaceHeaderProps {
  pendingOnboarding?: number;
  pendingApprovals?: number;
  expiringContracts?: number;
}

export function HrWorkspaceHeader({
  pendingOnboarding = 0,
  pendingApprovals = 0,
  expiringContracts = 0,
}: HrWorkspaceHeaderProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const totalAttention = pendingOnboarding + pendingApprovals + expiringContracts;

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">
        {greeting} — HR Operations
      </h1>
      {totalAttention > 0 && (
        <p className="text-sm text-muted-foreground">
          {totalAttention} items need your attention today:
          {pendingOnboarding > 0 && ` ${pendingOnboarding} onboarding`}
          {pendingApprovals > 0 && `, ${pendingApprovals} approvals`}
          {expiringContracts > 0 && `, ${expiringContracts} contracts expiring`}
        </p>
      )}
      {totalAttention === 0 && (
        <p className="text-sm text-muted-foreground">All clear — no pending items.</p>
      )}
    </div>
  );
}
