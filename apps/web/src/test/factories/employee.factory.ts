/**
 * Employee test data factory.
 * Generates consistent EmployeeResponseDto-shaped objects for tests.
 */
import type { EmployeeResponseDto } from '@/api/generated/model';

type Overrides = Partial<EmployeeResponseDto>;

let counter = 0;

/** Returns a fresh employee fixture with optional overrides. */
export function createEmployeeFactory(overrides: Overrides = {}): EmployeeResponseDto {
  counter += 1;

  return {
    id: `emp-${counter}`,
    username: `employee${counter}`,
    employeeCode: `EMP00${counter}`,
    firstName: 'Nguyen',
    lastName: `Van ${counter}`,
    email: `employee${counter}@example.com`,
    phoneNumber: '0901234567',
    address: '123 Test Street',
    dob: '1990-01-15',
    gender: 'male',
    startDate: '2024-01-01',
    endDate: null,
    lastWorkingDate: null,
    status: 'working',
    contractType: null,
    contractStatus: null,
    contractEffectiveFrom: null,
    contractEffectiveTo: null,
    allowedTransitions: [],
    position: { id: 'pos-1', name: 'Software Engineer', isActive: true },
    avatar: null,
    department: { id: 'dept-1', name: 'Engineering' },
    certifications: [],
    documents: [],
    ...overrides,
  } as EmployeeResponseDto;
}
