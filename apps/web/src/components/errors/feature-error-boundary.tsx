/**
 * FeatureErrorBoundary — isolates feature-level errors so a crash in one
 * section doesn't take down the entire page.
 *
 * Usage:
 *   <FeatureErrorBoundary feature='attendance-history'>
 *     <AttendanceHistoryTable />
 *   </FeatureErrorBoundary>
 */
'use client';

import { ErrorBoundary } from '@/components/error-boundary';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  feature: string;
  /** Optional fallback UI override. Receives error + reset to let user retry. */
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
}

export function FeatureErrorBoundary({ children, feature, fallback }: Props) {
  return (
    <ErrorBoundary feature={feature} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
