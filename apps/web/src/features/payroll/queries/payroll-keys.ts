export const payrollKeys = {
  all: ['payroll'] as const,
  salaryStructures: {
    all: () => [...payrollKeys.all, 'salary-structures'] as const,
    lists: () => [...payrollKeys.salaryStructures.all(), 'list'] as const,
    list: (params?: Record<string, unknown>) => [...payrollKeys.salaryStructures.lists(), params] as const,
    details: () => [...payrollKeys.salaryStructures.all(), 'detail'] as const,
    detail: (id: string) => [...payrollKeys.salaryStructures.details(), id] as const,
  },
  periods: {
    all: () => [...payrollKeys.all, 'periods'] as const,
    lists: () => [...payrollKeys.periods.all(), 'list'] as const,
    list: (params?: Record<string, unknown>) => [...payrollKeys.periods.lists(), params] as const,
    details: () => [...payrollKeys.periods.all(), 'detail'] as const,
    detail: (id: string) => [...payrollKeys.periods.details(), id] as const,
  },
  runs: {
    all: () => [...payrollKeys.all, 'runs'] as const,
    lists: () => [...payrollKeys.runs.all(), 'list'] as const,
    list: (params?: Record<string, unknown>) => [...payrollKeys.runs.lists(), params] as const,
    details: () => [...payrollKeys.runs.all(), 'detail'] as const,
    detail: (id: string) => [...payrollKeys.runs.details(), id] as const,
  },
  payslips: {
    all: () => [...payrollKeys.all, 'payslips'] as const,
    lists: () => [...payrollKeys.payslips.all(), 'list'] as const,
    list: (params?: Record<string, unknown>) => [...payrollKeys.payslips.lists(), params] as const,
    details: () => [...payrollKeys.payslips.all(), 'detail'] as const,
    detail: (id: string) => [...payrollKeys.payslips.details(), id] as const,
  },
};
