import { customFetch } from '@/lib/fetcher';

const BASE = '/api/v1/onboarding/processes';

export async function listOnboardingProcesses(page = 1, limit = 20) {
  return customFetch(`${BASE}?page=${page}&limit=${limit}`);
}

export async function getOnboardingProcess(id: string) {
  return customFetch(`${BASE}/${id}`);
}
