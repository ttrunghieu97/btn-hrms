'use client';

import { useState } from 'react';
import { ConfigSection } from './config-section';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface FeatureFlag {
  key: string;
  label: string;
  description?: string;
  enabled: boolean;
}

const defaultFlags: FeatureFlag[] = [
  { key: 'workspace', label: 'Employee Workspace', description: 'Personal workspace for employees', enabled: true },
  { key: 'notifications', label: 'Notification Center', description: 'Centralized notification inbox', enabled: true },
  { key: 'activity', label: 'Activity Center', description: 'Unified activity timeline', enabled: true },
  { key: 'dashboard-intel', label: 'Dashboard Intelligence', description: 'Smart insights and trends', enabled: true },
  { key: 'global-search', label: 'Global Search', description: 'Cross-entity search', enabled: true },
  { key: 'ai-assistant', label: 'AI Assistant', description: 'Experimental AI features', enabled: false },
];

export function FeatureFlagsCard() {
  const [flags, setFlags] = useState(defaultFlags);

  const toggleFlag = (key: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  return (
    <ConfigSection title="Feature Flags" description="Enable or disable platform features">
      <div className="space-y-4">
        {flags.map((flag) => (
          <div key={flag.key} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{flag.label}</Label>
              {flag.description && (
                <p className="text-xs text-muted-foreground">{flag.description}</p>
              )}
            </div>
            <Switch
              checked={flag.enabled}
              onCheckedChange={() => toggleFlag(flag.key)}
            />
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <Button size="sm" className="h-8 text-xs">Save Configuration</Button>
        </div>
      </div>
    </ConfigSection>
  );
}
