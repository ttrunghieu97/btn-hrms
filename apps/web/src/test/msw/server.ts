/**
 * MSW test server for integration/component tests.
 * Combines all domain handlers.
 */
import { setupServer } from 'msw/node';
import { employeeHandlers } from './handlers/employee.handlers';
import { attendanceHandlers } from './handlers/attendance.handlers';
import { leaveHandlers } from './handlers/leave.handlers';
import { payrollHandlers } from './handlers/payroll.handlers';

export const server = setupServer(
  ...employeeHandlers,
  ...attendanceHandlers,
  ...leaveHandlers,
  ...payrollHandlers,
);
