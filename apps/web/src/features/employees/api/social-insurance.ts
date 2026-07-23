import { customFetch } from '@/lib/fetcher';
import { extractList } from '@/lib/api-extract';

export interface SocialInsuranceRecord {
  id: string;
  employeeId: string;
  insuranceNumber: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSocialInsuranceDto {
  insuranceNumber: string;
  startDate: string;
  endDate?: string;
  status?: string;
  reason?: string;
}

export async function listSocialInsurances(employeeId: string): Promise<SocialInsuranceRecord[]> {
  const res = await customFetch(`/api/v1/employees/${employeeId}/social-insurance`);
  return extractList<SocialInsuranceRecord>(res);
}

export async function createSocialInsurance(employeeId: string, dto: CreateSocialInsuranceDto) {
  return customFetch(`/api/v1/employees/${employeeId}/social-insurance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}

export async function deleteSocialInsurance(employeeId: string, enrollmentId: string) {
  return customFetch(`/api/v1/employees/${employeeId}/social-insurance/${enrollmentId}`, {
    method: 'DELETE',
  });
}
