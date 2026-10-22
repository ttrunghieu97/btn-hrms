'use client';

import * as React from 'react';
import { ErrorBoundary } from '@/components/error-boundary';

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>
        <ErrorBoundary feature='attendance'>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
