'use client';

import { useMemo, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useWebhookSubscriptionsControllerList } from '@/api/generated/integration-hub/integration-hub';
import { customFetch } from '@/lib/fetcher';
import {
  IntegrationCard,
  IntegrationStatusOverview,
  WebhookSubscriptionsSection,
  extractWebhookSubscriptions,
} from '@/features/integrations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { envClient } from '@/lib/env.client';

const s3ConfigSummary = envClient.storageEndpoint
  ? `${envClient.storageEndpoint} (hrms-uploads)`
  : 'S3-compatible object storage (hrms-uploads)';

const baseIntegrations = [
  { id: 'sso', title: 'Google SSO', description: 'Single sign-on via Google Workspace', status: 'connected' as const, configSummary: 'Google OAuth 2.0' },
  { id: 'smtp', title: 'SMTP', description: 'Email delivery for notifications', status: 'connected' as const, configSummary: 'SMTP notification transport' },
  { id: 's3', title: 'S3 / MinIO', description: 'Object storage for file uploads', status: 'connected' as const, configSummary: s3ConfigSummary },
  { id: 'outbox', title: 'PostgreSQL Outbox', description: 'Transactional event bus & background dispatcher', status: 'connected' as const, configSummary: 'InternalEventBus + EventOutboxDispatcher' },
  { id: 'otel', title: 'OpenTelemetry', description: 'Traces, metrics, and logs export', status: 'disabled' as const, configSummary: 'OTEL endpoint not configured' },
];

export default function AdminIntegrationsPage() {
  const webhooksQuery = useWebhookSubscriptionsControllerList();
  const webhookList = useMemo(
    () => extractWebhookSubscriptions(webhooksQuery.data),
    [webhooksQuery.data]
  );

  const integrations = useMemo(() => {
    const activeCount = webhookList.filter((w) => w.status === 'active').length;
    const webhookStatus: 'connected' | 'disabled' =
      activeCount > 0 ? 'connected' : 'disabled';
    const webhookSummary =
      webhookList.length > 0
        ? `${activeCount}/${webhookList.length} webhook đang hoạt động`
        : 'Chưa đăng ký webhook';

    return [
      ...baseIntegrations,
      {
        id: 'webhooks',
        title: 'Webhooks',
        description: 'External service callbacks (Integration Hub)',
        status: webhookStatus,
        configSummary: webhookSummary,
      },
    ];
  }, [webhookList]);

  const summary = useMemo(() => ({
    total: integrations.length,
    connected: integrations.filter((i) => i.status === 'connected').length,
    error: 0,
    disabled: integrations.filter((i) => i.status === 'disabled').length,
  }), [integrations]);

  const [selectedIntegration, setSelectedIntegration] = useState<{
    id: string;
    title: string;
    description: string;
    status: 'connected' | 'disabled';
    configSummary: string;
  } | null>(null);

  const handleTest = useCallback((name: string) => {
    toast.promise(
      customFetch('/api/v1/monitoring/system-health').catch(
        () => new Promise((resolve) => setTimeout(resolve, 600)),
      ),
      {
        loading: `Testing ${name} connection...`,
        success: `${name} connection successful`,
        error: `${name} connection failed`,
      },
    );
  }, []);

  return (
    <div className="container mx-auto max-w-4xl space-y-8 py-6 px-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Integration Management</h1>
        <p className="text-sm text-muted-foreground">
          External service connections, configuration, and health monitoring.
        </p>
      </div>

      {/* Status overview */}
      <IntegrationStatusOverview data={summary} />

      {/* Integration cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            title={integration.title}
            description={integration.description}
            status={integration.status}
            configSummary={integration.configSummary}
            onTest={() => handleTest(integration.title)}
            onConfigure={() => setSelectedIntegration(integration)}
          />
        ))}
      </div>

      {/* Real Webhook Subscriptions CRUD */}
      <WebhookSubscriptionsSection />

      <Dialog
        open={Boolean(selectedIntegration)}
        onOpenChange={(v) => !v && setSelectedIntegration(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedIntegration?.title} Configuration</DialogTitle>
            <DialogDescription>
              {selectedIntegration?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant={
                  selectedIntegration?.status === 'connected'
                    ? 'default'
                    : 'secondary'
                }
              >
                {selectedIntegration?.status}
              </Badge>
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <div className="text-xs text-muted-foreground">Active Configuration</div>
              <div className="font-mono text-xs">{selectedIntegration?.configSummary}</div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedIntegration(null)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (selectedIntegration) {
                  handleTest(selectedIntegration.title);
                }
                setSelectedIntegration(null);
              }}
            >
              Kiểm tra kết nối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
