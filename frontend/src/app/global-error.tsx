'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { AppErrorState } from '@/components/errors/app-error-state';
import { errorUiCopy } from '@/locales/vi/system-ui';
import { getErrorObservabilityContext } from '@/lib/error-taxonomy';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    const observabilityContext = getErrorObservabilityContext(error);
    Sentry.captureException(error, {
      tags: {
        error_domain: observabilityContext.errorDomain,
        error_kind: observabilityContext.errorKind,
        error_api_code: observabilityContext.errorApiCode,
        error_source: observabilityContext.errorSource
      },
      extra: {
        ...observabilityContext
      }
    });
  }, [error]);

  return (
    <html lang='vi'>
      <body>
        <AppErrorState
          error={error}
          subject={errorUiCopy.subjects.application}
          layout='page'
          showHomeAction
        />
      </body>
    </html>
  );
}
