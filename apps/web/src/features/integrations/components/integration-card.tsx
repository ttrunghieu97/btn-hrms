'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type IntegrationStatus = 'connected' | 'disabled' | 'error' | 'pending';

interface IntegrationCardProps {
  title: string;
  description: string;
  status: IntegrationStatus;
  statusLabel?: string;
  configSummary?: string;
  onTest?: () => void;
  onConfigure?: () => void;
}

const statusConfig: Record<IntegrationStatus, { label: string; className: string }> = {
  connected: { label: 'Connected', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  disabled: { label: 'Disabled', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  error: { label: 'Error', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

export function IntegrationCard({
  title,
  description,
  status,
  statusLabel,
  configSummary,
  onTest,
  onConfigure,
}: IntegrationCardProps) {
  const config = statusConfig[status];
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
          <Badge className={config.className}>{statusLabel ?? config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {configSummary && (
          <p className="text-xs text-muted-foreground mb-3 font-mono">{configSummary}</p>
        )}
        <div className="flex gap-2">
          {onTest && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onTest}>
              Test Connection
            </Button>
          )}
          {onConfigure && (
            <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={onConfigure}>
              Configure
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
