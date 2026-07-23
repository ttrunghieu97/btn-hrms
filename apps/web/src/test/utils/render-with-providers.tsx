/**
 * Custom render with app providers (React Query, router, etc.).
 * Use in component tests instead of raw RTL render.
 *
 * Usage:
 *   renderWithProviders(<EmployeeTable />);
 *   renderWithProviders(<Form />, { queryOptions: { ... } });
 */

import * as React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface ProvidersOptions {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: ProvidersOptions = {},
): RenderResult {
  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}
