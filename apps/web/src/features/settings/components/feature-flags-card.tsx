'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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

const STORAGE_KEY = 'btn-hrms:settings:feature-flags';

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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<string, boolean>;
      setFlags((prev) =>
        prev.map((f) =>
          typeof saved[f.key] === 'boolean' ? { ...f, enabled: saved[f.key] } : f,
        ),
      );
    } catch {
      // ignore storage parse error
    }
  }, []);

  const toggleFlag = (key: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  const handleSave = () => {
    try {
      const map = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      toast.success('Đã lưu cấu hình Feature Flags');
    } catch {
      toast.error('Không thể lưu cấu hình');
    }
  };

  const handleReset = () => {
    setFlags(defaultFlags);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    toast.success('Đã khôi phục mặc định Feature Flags');
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
              aria-label={flag.label}
              checked={flag.enabled}
              onCheckedChange={() => toggleFlag(flag.key)}
            />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleReset}
          >
            Khôi phục mặc định
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            onClick={handleSave}
          >
            Save Configuration
          </Button>
        </div>
      </div>
    </ConfigSection>
  );
}
