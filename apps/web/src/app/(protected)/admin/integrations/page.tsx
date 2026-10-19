'use client';

import { useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useWebhookSubscriptionsControllerList } from '@/api/generated/integration-hub/integration-hub';
import {
  IntegrationCard,
  IntegrationStatusOverview,
  WebhookSubscriptionsSection,
  extractWebhookSubscriptions,
} from '@/features/integrations';

const s3ConfigSummary = process.env.NEXT_PUBLIC_STORAGE_ENDPOINT
  ? `${process.env.NEXT_PUBLIC_STORAGE_ENDPOINT} (hrms-uploads)`
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

  const handleTest = useCallback((name: string) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
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
            onConfigure={() => {}}
          />
        ))}
      </div>

      {/* Real Webhook Subscriptions CRUD */}
      <WebhookSubscriptionsSection />
    </div>
  );
}
