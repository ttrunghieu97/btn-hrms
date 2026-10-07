'use client';

import { AppErrorState } from '@/components/errors/app-error-state';
import { errorUiCopy } from '@/locales/vi/system-ui';

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppErrorState
      error={error}
      reset={reset}
      subject={errorUiCopy.subjects.dashboard}
      layout='page'
      capture
    />
  );
}
