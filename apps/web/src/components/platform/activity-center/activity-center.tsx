'use client';

import { ActivityCenterFeed } from './activity-feed';

/**
 * Activity Center page component.
 * Route: /activity
 */
export function ActivityCenter() {
  return (
    <div className="container mx-auto max-w-3xl space-y-6 py-6 px-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Activity Center</h1>
        <p className="text-sm text-muted-foreground">
          Recent events, approvals, and system activity across your organization.
        </p>
      </div>
      <ActivityCenterFeed limit={50} />
    </div>
  );
}
