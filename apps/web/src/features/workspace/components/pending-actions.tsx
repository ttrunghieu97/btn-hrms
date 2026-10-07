'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import type { WorkspaceAction } from '../types';

interface PendingActionsProps {
  actions: WorkspaceAction[];
  isLoading?: boolean;
}

const priorityConfig = {
  high: { label: 'High', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  low: { label: 'Low', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
};

const typeLabels: Record<WorkspaceAction['type'], string> = {
  approval: 'Approval',
  task: 'Task',
  notification: 'Notification',
  document: 'Document',
};

export function PendingActions({ actions, isLoading }: PendingActionsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Pending Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Pending Actions</CardTitle></CardHeader>
        <CardContent>
          <AppEmptyState
            title="No pending actions"
            description="You're all caught up."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pending Actions</CardTitle>
        <Badge variant="secondary">{actions.length} items</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actions.map((action) => (
            <Link
              key={action.id}
              href={action.url}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{action.title}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {typeLabels[action.type]}
                  </Badge>
                </div>
                {action.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {action.description}
                  </p>
                )}
              </div>
              {action.priority && (
                <Badge className={priorityConfig[action.priority].className}>
                  {priorityConfig[action.priority].label}
                </Badge>
              )}
              <Button variant="ghost" size="sm" asChild>
                <span>View →</span>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
