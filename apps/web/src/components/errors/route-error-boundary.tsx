/**
 * RouteErrorBoundary — reusable component for Next.js route error.tsx files.
 *
 * Usage in app/(protected)/some-route/error.tsx:
 *   'use client';
 *   import { RouteErrorBoundary } from '@/components/errors/route-error-boundary';
 *   export default function SomeRouteError(props) {
 *     return <RouteErrorBoundary {...props} subject='some-route' />;
 *   }
 */
'use client';

import { AppErrorState } from './app-error-state';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
  subject?: string;
  capture?: boolean;
}

export function RouteErrorBoundary({ error, reset, subject, capture = true }: Props) {
  return (
    <AppErrorState
      error={error}
      reset={reset}
      subject={subject}
      layout='page'
      capture={capture}
      showHomeAction
    />
  );
}
