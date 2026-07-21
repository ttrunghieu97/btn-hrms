'use client';

import * as React from 'react';
import * as Sentry from '@sentry/nextjs';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorUiCopy } from '@/locales/vi/system-ui';
import { getErrorObservabilityContext } from '@/lib/error-taxonomy';
import { cn } from '@/lib/utils';
import { getErrorPresentation } from '@/lib/error-presentation';

type ErrorLike = Error & {
  code?: string;
  status?: number;
  digest?: string;
  requestId?: string;
};

type AppErrorStateProps = {
  error: ErrorLike;
  reset?: () => void;
  subject?: string;
  layout?: 'page' | 'panel' | 'inline';
  className?: string;
  capture?: boolean;
  showHomeAction?: boolean;
};

const layoutClassNames: Record<NonNullable<AppErrorStateProps['layout']>, string> = {
  page: 'mx-auto min-h-[60vh] max-w-2xl p-6',
  panel: 'w-full',
  inline: 'w-full'
};

export function AppErrorState({
  error,
  reset,
  subject,
  layout = 'panel',
  className,
  capture = false,
  showHomeAction = false
}: AppErrorStateProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const presentation = React.useMemo(
    () => getErrorPresentation(error, subject),
    [error, subject]
  );
  const observabilityContext = React.useMemo(
    () => getErrorObservabilityContext(error),
    [error]
  );

  React.useEffect(() => {
    if (!capture) return;
    Sentry.captureException(error, {
      tags: {
        error_domain: observabilityContext.errorDomain,
        error_kind: observabilityContext.errorKind,
        error_api_code: observabilityContext.errorApiCode,
        error_source: observabilityContext.errorSource
      },
      extra: {
        subject,
        digest: error.digest,
        requestId: error.requestId,
        ...observabilityContext
      }
    });
  }, [capture, error, observabilityContext, subject]);

  const handlePrimaryAction = React.useCallback(() => {
    if (presentation.primaryAction === 'home') {
      router.push('/');
      return;
    }

    if (presentation.primaryAction === 'sign-in') {
      router.push('/auth/sign-in');
      return;
    }

    startTransition(() => {
      if (reset) {
        reset();
      }
      router.refresh();
    });
  }, [presentation.primaryAction, reset, router]);

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        layoutClassNames[layout],
        className
      )}
    >
      <Card className='w-full max-w-2xl border-dashed'>
        <CardHeader className='gap-3'>
          <div className='bg-destructive/10 text-destructive flex h-12 w-12 items-center justify-center rounded-full'>
            <Icons.alertCircle className='h-6 w-6' />
          </div>
          <div className='space-y-1'>
            <CardTitle className='text-2xl'>{presentation.title}</CardTitle>
            <CardDescription className='text-base'>{presentation.description}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className='space-y-4'>
          {presentation.referenceId ? (
            <div className='bg-muted/40 rounded-lg border px-4 py-3 text-sm'>
              <div className='font-medium'>{errorUiCopy.referenceIdLabel}</div>
              <div className='text-muted-foreground mt-1 font-mono'>
                {presentation.referenceId}
              </div>
            </div>
          ) : null}

          <div className='flex flex-col gap-3 sm:flex-row'>
            <Button
              onClick={handlePrimaryAction}
              isLoading={presentation.primaryAction === 'retry' ? isPending : undefined}
            >
              {presentation.primaryAction === 'retry' ? <Icons.refresh /> : null}
              {presentation.primaryLabel}
            </Button>
            {showHomeAction && presentation.primaryAction !== 'home' ? (
              <Button type='button' variant='outline' onClick={() => router.push('/')}>
                {errorUiCopy.backToHome}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
