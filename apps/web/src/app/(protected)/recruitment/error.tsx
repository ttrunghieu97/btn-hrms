'use client';

import { ErrorState } from '@/components/states';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function recruitmentError({ error, reset }: ErrorProps) {
  return <ErrorState error={error} onRetry={reset} subject='recruitment' capture />;
}
