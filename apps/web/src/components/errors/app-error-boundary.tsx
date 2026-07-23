/**
 * AppErrorBoundary — catches errors at the root application level.
 * Wraps the entire app in layout.tsx. Single source of truth for
 * app-wide error recovery.
 *
 * Delegates to ErrorBoundary with 'app' feature tag for observability.
 */
'use client';

import { ErrorBoundary } from '@/components/error-boundary';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function AppErrorBoundary({ children }: Props) {
  return <ErrorBoundary feature='app'>{children}</ErrorBoundary>;
}
