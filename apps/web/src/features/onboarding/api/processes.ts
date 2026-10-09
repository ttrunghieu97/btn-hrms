import { customFetch } from '@/lib/fetcher';

const BASE = '/api/v1/onboarding/processes';

export async function listOnboardingProcesses(page = 1, limit = 20) {
  return customFetch(`${BASE}?page=${page}&limit=${limit}`);
}

export async function getOnboardingProcess(id: string) {
  return customFetch(`${BASE}/${id}`);
}

export async function completeOnboardingItem(processId: string, itemId: string, note?: string) {
  return customFetch(`${BASE}/${processId}/items/${itemId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function reopenOnboardingItem(processId: string, itemId: string, note?: string) {
  return customFetch(`${BASE}/${processId}/items/${itemId}/reopen`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function skipOnboardingItem(processId: string, itemId: string, note?: string) {
  return customFetch(`${BASE}/${processId}/items/${itemId}/skip`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}
