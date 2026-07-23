'use client';

import { useState } from 'react';
import { ConfigSection } from './config-section';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function ObservabilityConfigCard() {
  const [metricsEnabled, setMetricsEnabled] = useState(true);
  const [tracingEnabled, setTracingEnabled] = useState(true);
  const [strictReady, setStrictReady] = useState(true);
  const [sentryEnabled, setSentryEnabled] = useState(true);
  const [retention] = useState('30 days');

  return (
    <ConfigSection title="Observability" description="Monitoring, logging, and tracing configuration">
      <div className="space-y-4">
        <ConfigRow label="Metrics (Prometheus)">
          <Switch checked={metricsEnabled} onCheckedChange={setMetricsEnabled} />
        </ConfigRow>
        <ConfigRow label="Distributed Tracing">
          <Switch checked={tracingEnabled} onCheckedChange={setTracingEnabled} />
        </ConfigRow>
        <ConfigRow label="Strict Health Checks">
          <Switch checked={strictReady} onCheckedChange={setStrictReady} />
        </ConfigRow>
        <ConfigRow label="Error Tracking (Sentry)">
          <Switch checked={sentryEnabled} onCheckedChange={setSentryEnabled} />
        </ConfigRow>
        <ConfigRow label="Data Retention">
          <Badge variant="secondary" className="font-mono">{retention}</Badge>
        </ConfigRow>
        <div className="flex justify-end pt-2">
          <Button size="sm" className="h-8 text-xs">Save Observability Settings</Button>
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
