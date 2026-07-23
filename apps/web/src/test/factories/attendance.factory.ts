/**
 * Attendance test data factory.
 */
import type { AttendanceResponseDto } from '@/api/generated/model';

type Overrides = Partial<AttendanceResponseDto>;

let counter = 0;

export function createAttendanceFactory(overrides: Overrides = {}): AttendanceResponseDto {
  counter += 1;
  return {
    username: `employee${counter}`,
    date: '2026-07-22',
    morningCheckin: '08:00',
    morningCheckout: '12:00',
    noonCheck: null,
    afternoonCheckin: '13:00',
    afternoonCheckout: '17:00',
    morningCheckinImage: null,
    morningCheckoutImage: null,
    noonCheckImage: null,
    afternoonCheckinImage: null,
    afternoonCheckoutImage: null,
    note: null,
    employee: { id: `emp-${counter}`, firstName: 'Nguyen', lastName: `Van ${counter}` },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as AttendanceResponseDto;
}
