'use client';

import { WorkspaceHeader, TodayStatus, PendingActions, QuickActions, useWorkspaceData } from '@/features/workspace';

export default function WorkspacePage() {
  const { summary, actions, isLoading } = useWorkspaceData();

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-6 px-4">
      {/* Greeting header */}
      <WorkspaceHeader userName="Hieu" />

      {/* Today status cards */}
      <TodayStatus summary={summary} />

      {/* Two-column layout for pending actions + quick actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PendingActions actions={actions} isLoading={isLoading} />
        <QuickActions />
      </div>
    </div>
  );
}
