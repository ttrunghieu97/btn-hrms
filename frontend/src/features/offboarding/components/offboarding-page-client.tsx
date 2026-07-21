'use client';

import { useQueryStates, parseAsString } from 'nuqs';
import { OffboardingView } from './offboarding-view';
import { OffboardingDetailView } from './offboarding-detail-view';

export function OffboardingPageClient() {
  const [params] = useQueryStates({
    id: parseAsString,
  });

  if (params.id) {
    return <OffboardingDetailView processId={params.id} />;
  }

  return <OffboardingView />;
}
