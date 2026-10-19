import { customFetch } from '@/lib/fetcher';

const BASE = '/api/v1/onboarding/processes';

export async function listOnboardingProcesses(
  page = 1,
  limit = 20,
  status?: string | null,
  employeeId?: string | null,
) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) qs.set('status', status);
  if (employeeId) qs.set('employeeId', employeeId);
  return customFetch(`${BASE}?${qs.toString()}`);
}

export async function createOnboardingProcess(dto: {
  employeeId: string;
  templateId: string;
  joinDate?: string;
}) {
  return customFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}

export async function getOnboardingProcess(id: string) {
  return customFetch(`${BASE}/${id}`);
}

export async function completeOnboardingItem(processId: string, itemId: string, note?: string) {
  return customFetch(`${BASE}/${processId}/items/${itemId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
}

export async function reopenOnboardingItem(processId: string, itemId: string, note?: string) {
  return customFetch(`${BASE}/${processId}/items/${itemId}/reopen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
}

export async function skipOnboardingItem(processId: string, itemId: string, note?: string) {
  return customFetch(`${BASE}/${processId}/items/${itemId}/skip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
}
