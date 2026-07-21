// ── Shared ──────────────────────────────────────────
export interface PayrollEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
}

// ── Salary Structures ──────────────────────────────
export interface SalaryStructure {
  id: string;
  employeeId: string;
  currency: string;
  payFrequency: string;
  baseSalary: string;
  components: Record<string, unknown> | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  employee?: PayrollEmployee;
}

export interface SalaryStructureListParams {
  employeeId?: string;
  page?: number;
  limit?: number;
}

export interface CreateSalaryStructurePayload {
  employeeId: string;
  payFrequency: string;
  baseSalary: string;
  components?: Record<string, unknown>;
  effectiveFrom: string;
  effectiveTo?: string;
  currency?: string;
  isCurrent?: boolean;
}

// ── Payroll Periods ────────────────────────────────
export type PayrollPeriodStatus = 'draft' | 'open' | 'processing' | 'closed' | 'paid';

export interface PayrollPeriod {
  id: string;
  code: string;
  name: string;
  startsOn: string;
  endsOn: string;
  payDate: string | null;
  status: PayrollPeriodStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollPeriodListParams {
  status?: PayrollPeriodStatus;
  page?: number;
  limit?: number;
}

export interface CreatePayrollPeriodPayload {
  code: string;
  name: string;
  startsOn: string;
  endsOn: string;
  payDate?: string;
  status?: PayrollPeriodStatus;
}

export interface UpdatePayrollPeriodPayload {
  name?: string;
  startsOn?: string;
  endsOn?: string;
  status?: PayrollPeriodStatus;
}

// ── Payroll Runs ────────────────────────────────────
export type PayrollRunStatus = 'draft' | 'processing' | 'approved' | 'posted' | 'cancelled';

export interface PayrollRun {
  id: string;
  payrollPeriodId: string;
  branchId: string | null;
  status: PayrollRunStatus;
  approvedByUserId: string | null;
  approvedAt: string | null;
  processedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  payrollPeriod?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface PayrollRunListParams {
  payrollPeriodId?: string;
  status?: PayrollRunStatus;
  page?: number;
  limit?: number;
}

export interface CreatePayrollRunPayload {
  payrollPeriodId: string;
  branchId?: string;
  notes?: string;
}

export interface UpdatePayrollRunPayload {
  payrollPeriodId?: string;
  branchId?: string;
  notes?: string;
  status?: PayrollRunStatus;
}

// ── Payslips ────────────────────────────────────────
export type PayslipStatus = 'draft' | 'published' | 'acknowledged' | 'voided';

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  grossPay: string;
  totalDeductions: string;
  netPay: string;
  currency: string;
  status: PayslipStatus;
  publishedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    departmentName?: string | null;
  };
  payrollRun?: {
    id: string;
    status: string;
    payrollPeriodId: string;
  };
}

export interface PayslipListParams {
  employeeId?: string;
  payrollRunId?: string;
  status?: PayslipStatus;
  page?: number;
  limit?: number;
}

export interface PublishPayslipPayload {
  note?: string;
}
