'use client';

import { ErrorState } from '@/components/states';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LeaveError({ error, reset }: ErrorProps) {
  return <ErrorState error={error} onRetry={reset} subject='leave' capture />;
}
