'use client';

import { AppErrorState } from '@/components/errors/app-error-state';
import { errorUiCopy } from '@/locales/vi/system-ui';

export default function EmployeesError({
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
      subject={errorUiCopy.subjects.systemData}
      layout='page'
      capture
    />
  );
}
