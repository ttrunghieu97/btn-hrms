'use client';

import {
  FeatureFlagsCard,
  SecurityConfigCard,
  ObservabilityConfigCard,
} from '@/features/settings';

export default function AdminSettingsPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-8 py-6 px-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Configuration Center</h1>
        <p className="text-sm text-muted-foreground">
          Platform settings, feature flags, and operational configuration.
        </p>
      </div>

      {/* Feature flags */}
      <FeatureFlagsCard />

      {/* Security */}
      <SecurityConfigCard />

      {/* Observability */}
      <ObservabilityConfigCard />
    </div>
  );
}
