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

  describe('useCreateOnboardingProcess & useCompleteOnboardingItem', () => {
    it('creates an onboarding process for an employee and invalidates process queries', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { id: 'proc-1', employeeId: 'emp-1', status: 'pending' },
        status: 201, headers: new Headers(),
      });

      const { useCreateOnboardingProcess } = await import('./mutations');
      const { qc, Wrapper } = createWrapper();
      const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useCreateOnboardingProcess(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({
          employeeId: 'emp-1',
          templateId: 'tpl-1',
          joinDate: '2026-11-01',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(customFetch).toHaveBeenCalledWith(
        '/api/v1/onboarding/processes',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            employeeId: 'emp-1',
            templateId: 'tpl-1',
            joinDate: '2026-11-01',
          }),
        }),
      );
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('completes an onboarding checklist item', async () => {
      (customFetch as jest.Mock).mockResolvedValue({
        data: { id: 'item-1', status: 'completed', isCompleted: true },
        status: 200, headers: new Headers(),
      });

      const { useCompleteOnboardingItem } = await import('./mutations');
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCompleteOnboardingItem(), { wrapper: Wrapper });

      await act(async () => {
        result.current.mutate({ processId: 'proc-1', itemId: 'item-1', note: 'Done' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(customFetch).toHaveBeenCalledWith(
        '/api/v1/onboarding/processes/proc-1/items/item-1/complete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ note: 'Done' }),
        }),
      );
    });
  });
});
