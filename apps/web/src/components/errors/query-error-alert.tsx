'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorUiCopy } from '@/locales/vi/system-ui';
import { getErrorPresentation } from '@/lib/error-presentation';

type ErrorLike = Error & {
  code?: string;
  status?: number;
  digest?: string;
  requestId?: string;
};

export function QueryErrorAlert({
  error,
  subject,
  onRetry,
  className
}: {
  error: unknown;
  subject: string;
  onRetry?: () => void;
  className?: string;
}) {
  const resolvedError: ErrorLike =
    error instanceof Error ? (error as ErrorLike) : new Error('Unknown error');
  const presentation = getErrorPresentation(resolvedError, subject);

  return (
    <Alert variant='destructive' className={className}>
      <AlertTitle>{presentation.title}</AlertTitle>
      <AlertDescription className='flex items-center justify-between gap-3'>
        <div className='min-w-0 space-y-1'>
          <div>{presentation.description}</div>
          {presentation.referenceId ? (
            <div className='text-xs font-mono opacity-80'>
              {errorUiCopy.referenceIdLabel}: {presentation.referenceId}
            </div>
          ) : null}
        </div>
        {onRetry ? (
          <Button type='button' variant='outline' size='sm' onClick={onRetry}>
            {presentation.primaryLabel}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
