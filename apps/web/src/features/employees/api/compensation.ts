import { customFetch } from '@/lib/fetcher';
import { extractList, unwrapData } from '@/lib/api-extract';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';

export type AllowanceType =
  | 'position'
  | 'salary'
  | 'seniority'
  | 'professional_seniority'
  | 'additional';

export interface EmployeeAllowance {
  id: string;
  employeeId: string;
  type: AllowanceType;
  amount: string | number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAllowanceDto {
  type: AllowanceType;
  amount: number;
  effectiveFrom: string;
  effectiveTo?: string;
  note?: string;
}

export interface UpdateAllowanceDto {
  type?: AllowanceType;
  amount?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  note?: string;
}

export interface EmployeeSalaryStructure {
  id: string;
  employeeId: string;
  currency: string;
  payFrequency: string;
  baseSalary: string | number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isCurrent: boolean;
  components?: unknown;
}

export interface UpsertSalaryStructureDto {
  employeeId: string;
  payFrequency: string;
  baseSalary: string;
  effectiveFrom: string;
  effectiveTo?: string;
  currency?: string;
  isCurrent?: boolean;
}

export const compensationKeys = {
  allowances: (employeeId: string) => ['employee-allowances', employeeId] as const,
  salary: (employeeId: string) => ['employee-salary-structure', employeeId] as const,
};

// ─── Allowance API functions ──────────────────────────────────────────

export async function listEmployeeAllowances(employeeId: string): Promise<EmployeeAllowance[]> {
  const res = await customFetch(`/api/v1/employees/${employeeId}/allowances`);
  return extractList<EmployeeAllowance>(res);
}

export async function createEmployeeAllowance(employeeId: string, dto: CreateAllowanceDto): Promise<EmployeeAllowance> {
  const res = await customFetch(`/api/v1/employees/${employeeId}/allowances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return unwrapData<EmployeeAllowance>(res);
}

export async function updateEmployeeAllowance(
  employeeId: string,
  allowanceId: string,
  dto: UpdateAllowanceDto,
): Promise<EmployeeAllowance> {
  const res = await customFetch(`/api/v1/employees/${employeeId}/allowances/${allowanceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return unwrapData<EmployeeAllowance>(res);
}

export async function deleteEmployeeAllowance(employeeId: string, allowanceId: string): Promise<void> {
  await customFetch(`/api/v1/employees/${employeeId}/allowances/${allowanceId}`, {
    method: 'DELETE',
  });
}

// ─── Salary API functions ─────────────────────────────────────────────

export async function getEmployeeSalaryStructure(employeeId: string): Promise<EmployeeSalaryStructure | null> {
  try {
    const res = await customFetch<{ data: { data: EmployeeSalaryStructure[] } }>(
      `/api/v1/payroll/salary-structures?employeeId=${employeeId}&limit=10`,
    );
    const list = extractList<EmployeeSalaryStructure>(res);
    return list.find((s) => s.isCurrent) ?? list[0] ?? null;
  } catch {
    return null;
  }
}

export async function upsertEmployeeSalaryStructure(dto: UpsertSalaryStructureDto): Promise<EmployeeSalaryStructure> {
  const res = await customFetch(`/api/v1/payroll/salary-structures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return unwrapData<EmployeeSalaryStructure>(res);
}

// ─── React Query Hooks ────────────────────────────────────────────────

export function useEmployeeAllowancesQuery(employeeId: string) {
  return useQuery({
    queryKey: compensationKeys.allowances(employeeId),
    queryFn: () => listEmployeeAllowances(employeeId),
    enabled: Boolean(employeeId),
  });
}

export function useEmployeeSalaryQuery(employeeId: string) {
  return useQuery({
    queryKey: compensationKeys.salary(employeeId),
    queryFn: () => getEmployeeSalaryStructure(employeeId),
    enabled: Boolean(employeeId),
  });
}

export function useCreateAllowanceMutation(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAllowanceDto) => createEmployeeAllowance(employeeId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: compensationKeys.allowances(employeeId) });
      notifyMutationSuccess('Thêm phụ cấp thành công');
    },
    onError: (err) => notifyMutationError(err, 'Thêm phụ cấp thất bại'),
  });
}

export function useUpdateAllowanceMutation(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ allowanceId, dto }: { allowanceId: string; dto: UpdateAllowanceDto }) =>
      updateEmployeeAllowance(employeeId, allowanceId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: compensationKeys.allowances(employeeId) });
      notifyMutationSuccess('Cập nhật phụ cấp thành công');
    },
    onError: (err) => notifyMutationError(err, 'Cập nhật phụ cấp thất bại'),
  });
}

export function useDeleteAllowanceMutation(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (allowanceId: string) => deleteEmployeeAllowance(employeeId, allowanceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: compensationKeys.allowances(employeeId) });
      notifyMutationSuccess('Đã xoá khoản phụ cấp');
    },
    onError: (err) => notifyMutationError(err, 'Xoá phụ cấp thất bại'),
  });
}

export function useUpsertSalaryMutation(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpsertSalaryStructureDto) => upsertEmployeeSalaryStructure(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: compensationKeys.salary(employeeId) });
      notifyMutationSuccess('Cập nhật lương cơ bản thành công');
    },
    onError: (err) => notifyMutationError(err, 'Cập nhật lương cơ bản thất bại'),
  });
}
