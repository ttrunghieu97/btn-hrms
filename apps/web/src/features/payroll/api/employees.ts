import { employeesControllerFindAll } from '@/api/generated/endpoints';
import { unwrapData } from '@/lib/api-extract';

export interface EmployeeOption {
  id: string;
  code: string;
  name: string;
}

export async function searchEmployees(search?: string): Promise<EmployeeOption[]> {
  const res = await employeesControllerFindAll({ limit: 100, search: search || undefined });
  const employees = unwrapData<{ id: string; employeeCode: string | null; firstName: string; lastName: string }[]>(res);
  return (employees ?? []).map((e) => ({
    id: e.id,
    code: e.employeeCode ?? '',
    name: `${e.firstName} ${e.lastName}`.trim(),
  }));
}
