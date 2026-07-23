/**
 * Leave request test data factory.
 * Generates leave request shapes for tests.
 */
import type { CreateLeaveRequestDto } from '@/api/generated/model';

type Overrides = Partial<CreateLeaveRequestDto>;

let counter = 0;

export interface LeaveRequestResponse {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export function createLeaveRequestFactory(overrides: Overrides = {}): CreateLeaveRequestDto {
  counter += 1;
  return {
    employeeId: `emp-${counter}`,
    leaveTypeId: 'leave-type-1',
    startDate: '2026-08-01',
    endDate: '2026-08-01',
    reason: 'Personal leave',
    ...overrides,
  } as CreateLeaveRequestDto;
}

export function createLeaveRequestResponseFactory(
  overrides: Partial<LeaveRequestResponse> = {},
): LeaveRequestResponse {
  counter += 1;
  return {
    id: `leave-${counter}`,
    employeeId: `emp-${counter}`,
    leaveTypeId: 'leave-type-1',
    leaveTypeName: 'Annual Leave',
    status: 'pending',
    startDate: '2026-08-01',
    endDate: '2026-08-01',
    reason: 'Personal leave',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
