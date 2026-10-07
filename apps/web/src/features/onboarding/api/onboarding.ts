import { customFetch } from '@/lib/fetcher';

const BASE = '/api/v1/onboarding/templates';

export async function listOnboardingTemplates(params?: Record<string, unknown>) {
  const search = params ? `?${new URLSearchParams(params as any).toString()}` : '';
  return customFetch(`${BASE}${search}`);
}

export async function getOnboardingTemplate(id: string) {
  return customFetch(`${BASE}/${id}`);
}

export async function createOnboardingTemplate(dto: { name: string; type?: string; isDefault?: boolean; items?: Array<{ title: string; assigneeType?: string; dueDaysOffset?: number; isMandatory?: boolean }> }) {
  return customFetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) });
}

export async function updateOnboardingTemplate(id: string, dto: { name?: string; type?: string; isDefault?: boolean; items?: any[] }) {
  return customFetch(`${BASE}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) });
}

export async function deleteOnboardingTemplate(id: string) {
  return customFetch(`${BASE}/${id}`, { method: 'DELETE' });
}
