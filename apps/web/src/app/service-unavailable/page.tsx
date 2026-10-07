import { Icons } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { serviceUnavailablePageCopy } from '@/locales/vi/system-ui';
import type { Metadata } from 'next';
import type { SearchParams } from 'nuqs/server';
import RetryActions from './retry-actions';

export const metadata: Metadata = {
  title: serviceUnavailablePageCopy.metadataTitle,
  robots: {
    index: false,
    follow: false
  }
};

type ServiceUnavailablePageProps = {
  searchParams: Promise<SearchParams>;
};

function getSourceMessage(source: string | undefined) {
  if (source === 'auth-session') {
    return serviceUnavailablePageCopy.authSessionMessage;
  }

  return serviceUnavailablePageCopy.defaultMessage;
}

export default async function ServiceUnavailablePage({
  searchParams
}: ServiceUnavailablePageProps) {
  const params = await searchParams;
  const requestId =
    typeof params.requestId === 'string' && params.requestId.trim() ? params.requestId : undefined;
  const source = typeof params.source === 'string' ? params.source : undefined;

  return (
    <main className='bg-background flex min-h-screen items-center justify-center px-4 py-10'>
      <Card className='w-full max-w-2xl border-dashed'>
        <CardHeader className='gap-3'>
          <div className='bg-destructive/10 text-destructive flex h-12 w-12 items-center justify-center rounded-full'>
            <Icons.alertCircle className='h-6 w-6' />
          </div>
          <div className='space-y-1'>
            <CardTitle className='text-2xl'>{serviceUnavailablePageCopy.title}</CardTitle>
            <CardDescription className='text-base'>
              {getSourceMessage(source)}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='space-y-6'>
          <div className='text-muted-foreground space-y-2 text-sm leading-6'>
            <p>{serviceUnavailablePageCopy.retryAdvice}</p>
            <p>{serviceUnavailablePageCopy.supportAdvice}</p>
          </div>

          <div className='bg-muted/40 rounded-lg border px-4 py-3 text-sm'>
            <div className='font-medium'>{serviceUnavailablePageCopy.referenceIdLabel}</div>
            <div className='text-muted-foreground mt-1 font-mono'>
              {requestId ?? serviceUnavailablePageCopy.noRequestId}
            </div>
          </div>

          <RetryActions />
        </CardContent>
      </Card>
    </main>
  );
}
