'use client';

import { ErrorState } from '@/components/states';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PayrollError({ error, reset }: ErrorProps) {
  return <ErrorState error={error} onRetry={reset} subject='payroll' capture />;
}
