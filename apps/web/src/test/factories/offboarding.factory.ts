let counter = 0;

export interface OffboardingProcess {
  id: string;
  employeeId: string;
  employeeName: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'processing' | 'completed';
  startDate: string;
  completedDate: string | null;
  checklistItems: unknown[];
  clearances: unknown[];
  createdAt: string;
  updatedAt: string;
}

export function createOffboardingProcessFactory(
  overrides: Partial<OffboardingProcess> = {},
): OffboardingProcess {
  counter += 1;
  return {
    id: `offboard-${counter}`,
    employeeId: `emp-${counter}`,
    employeeName: `Employee ${counter}`,
    status: 'draft',
    startDate: '2026-07-01',
    completedDate: null,
    checklistItems: [],
    clearances: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
