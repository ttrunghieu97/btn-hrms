'use client';
import '../../bones/registry';
import React from 'react';
import { ActiveThemeProvider } from '../themes/active-theme';
import QueryProvider from './query-provider';
import { PermissionCatalogProvider } from '@/features/permissions/PermissionCatalogProvider';
import { GlobalErrorHandler } from '@/components/global-error-handler';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <GlobalErrorHandler>
      <ActiveThemeProvider initialTheme={activeThemeValue}>
        <QueryProvider>
          <PermissionCatalogProvider>
            {children}
          </PermissionCatalogProvider>
        </QueryProvider>
      </ActiveThemeProvider>
    </GlobalErrorHandler>
  );
}
