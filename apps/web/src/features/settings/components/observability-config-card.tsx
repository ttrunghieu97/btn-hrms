'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ConfigSection } from './config-section';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'btn-hrms:settings:observability';

export function ObservabilityConfigCard() {
  const [metricsEnabled, setMetricsEnabled] = useState(true);
  const [tracingEnabled, setTracingEnabled] = useState(true);
  const [strictReady, setStrictReady] = useState(true);
  const [sentryEnabled, setSentryEnabled] = useState(true);
  const [retention] = useState('30 days');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        metricsEnabled?: boolean;
        tracingEnabled?: boolean;
        strictReady?: boolean;
        sentryEnabled?: boolean;
      };
      if (typeof saved.metricsEnabled === 'boolean') setMetricsEnabled(saved.metricsEnabled);
      if (typeof saved.tracingEnabled === 'boolean') setTracingEnabled(saved.tracingEnabled);
      if (typeof saved.strictReady === 'boolean') setStrictReady(saved.strictReady);
      if (typeof saved.sentryEnabled === 'boolean') setSentryEnabled(saved.sentryEnabled);
    } catch {
      // ignore
    }
  }, []);

  const handleSave = () => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ metricsEnabled, tracingEnabled, strictReady, sentryEnabled }),
      );
      toast.success('Đã lưu cấu hình Giám sát (Observability)');
    } catch {
      toast.error('Không thể lưu cấu hình Giám sát');
    }
  };

  return (
    <ConfigSection title="Observability" description="Monitoring, logging, and tracing configuration">
      <div className="space-y-4">
        <ConfigRow label="Metrics (Prometheus)">
          <Switch aria-label="Metrics (Prometheus)" checked={metricsEnabled} onCheckedChange={setMetricsEnabled} />
        </ConfigRow>
        <ConfigRow label="Distributed Tracing">
          <Switch aria-label="Distributed Tracing" checked={tracingEnabled} onCheckedChange={setTracingEnabled} />
        </ConfigRow>
        <ConfigRow label="Strict Health Checks">
          <Switch aria-label="Strict Health Checks" checked={strictReady} onCheckedChange={setStrictReady} />
        </ConfigRow>
        <ConfigRow label="Error Tracking (Sentry)">
          <Switch aria-label="Error Tracking (Sentry)" checked={sentryEnabled} onCheckedChange={setSentryEnabled} />
        </ConfigRow>
        <ConfigRow label="Data Retention">
          <Badge variant="secondary" className="font-mono">{retention}</Badge>
        </ConfigRow>
        <div className="flex justify-end pt-2">
          <Button type="button" size="sm" className="h-8 text-xs" onClick={handleSave}>
            Save Observability Settings
          </Button>
        </div>
      </div>
    </ConfigSection>
  );
}

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
