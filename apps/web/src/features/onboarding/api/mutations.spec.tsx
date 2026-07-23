import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

jest.mock('@/lib/fetcher', () => ({ customFetch: jest.fn() }));
const { customFetch } = jest.requireMock('@/lib/fetcher');

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return { qc, Wrapper: ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children) };
}

describe('onboarding mutations', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('useCreateOnboardingTemplate', () => {
    it('creates template successfully', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { id: 'template-1', name: 'Standard', isActive: true },
        status: 201, headers: new Headers(),
      });

      const { useCreateOnboardingTemplate } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useCreateOnboardingTemplate(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ name: 'Standard', type: 'default' } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles creation error', async () => {
      (customFetch as jest.Mock).mockRejectedValue(new Error('Validation failed'));

      const { useCreateOnboardingTemplate } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateOnboardingTemplate(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ name: '' } as any);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useDeleteOnboardingTemplate', () => {
    it('deletes template successfully', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { success: true },
        status: 200, headers: new Headers(),
      });

      const { useDeleteOnboardingTemplate } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteOnboardingTemplate(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate('template-1' as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
