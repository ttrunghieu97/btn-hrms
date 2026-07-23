import type { OnboardingTemplateResponseDto } from '@/api/generated/model';

type Overrides = Partial<OnboardingTemplateResponseDto>;

let counter = 0;

export function createOnboardingTemplateFactory(overrides: Overrides = {}): OnboardingTemplateResponseDto {
  counter += 1;
  return {
    id: `template-${counter}`,
    name: `Onboarding Template ${counter}`,
    type: 'default',
    isActive: true,
    isDefault: counter === 1,
    items: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as OnboardingTemplateResponseDto;
}

export interface OnboardingProcess {
  id: string;
  employeeId: string;
  employeeName: string;
  templateId: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  startDate: string;
  completedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

let procCounter = 0;

export function createOnboardingProcessFactory(overrides: Partial<OnboardingProcess> = {}): OnboardingProcess {
  procCounter += 1;
  return {
    id: `process-${procCounter}`,
    employeeId: `emp-${procCounter}`,
    employeeName: `Employee ${procCounter}`,
    templateId: 'template-1',
    status: 'draft',
    startDate: new Date().toISOString().split('T')[0],
    completedDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
