let planCounter = 0;

export interface BenefitPlan {
  id: string;
  name: string;
  description: string | null;
  coverageType: string;
  status: 'draft' | 'active' | 'archived';
  employerContribution: number;
  employeeContribution: number;
  createdAt: string;
  updatedAt: string;
}

export function createBenefitPlanFactory(overrides: Partial<BenefitPlan> = {}): BenefitPlan {
  planCounter += 1;
  return {
    id: `plan-${planCounter}`,
    name: `Benefit Plan ${planCounter}`,
    description: `Description for plan ${planCounter}`,
    coverageType: 'employee_only',
    status: 'draft',
    employerContribution: 500000,
    employeeContribution: 200000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

let enrollCounter = 0;

export interface BenefitEnrollment {
  id: string;
  employeeId: string;
  employeeName: string;
  planId: string;
  planName: string;
  status: 'pending' | 'active' | 'cancelled';
  enrolledAt: string;
  cancelledAt: string | null;
}

export function createBenefitEnrollmentFactory(overrides: Partial<BenefitEnrollment> = {}): BenefitEnrollment {
  enrollCounter += 1;
  return {
    id: `enroll-${enrollCounter}`,
    employeeId: `emp-${enrollCounter}`,
    employeeName: `Employee ${enrollCounter}`,
    planId: 'plan-1',
    planName: 'Health Insurance',
    status: 'active',
    enrolledAt: new Date().toISOString(),
    cancelledAt: null,
    ...overrides,
  };
}
