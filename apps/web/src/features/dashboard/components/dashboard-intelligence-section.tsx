'use client';

import { useMemo } from 'react';
import { InsightCard, AttentionCard } from '@/components/platform';
import { getDashboardInsights } from '../api/dashboard-intelligence';
import type { DashboardPersona } from '../api/dashboard-intelligence';

interface DashboardIntelligenceSectionProps {
  persona: DashboardPersona;
}

/**
 * Intelligence section for dashboards.
 * Composes InsightCard grid + AttentionCard from the intelligence API.
 */
export function DashboardIntelligenceSection({ persona }: DashboardIntelligenceSectionProps) {
  const { insights, attention } = useMemo(
    () => getDashboardInsights(persona),
    [persona],
  );

  // This is a synchronous call in Phase 1 (placeholder data).
  // In Phase 2 with real API calls, use:
  //   const { data } = useQuery({ queryKey: ['dashboard-insights', persona], queryFn: () => getDashboardInsights(persona) });

  return (
    <div className="space-y-6">
      {/* Attention items (if any) */}
      {attention.length > 0 && (
        <AttentionCard items={attention} />
      )}

      {/* Insight grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}
