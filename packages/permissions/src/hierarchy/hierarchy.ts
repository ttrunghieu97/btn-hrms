/**
 * Centralized permission hierarchy definitions.
 * Each entry: most-specific → least-specific (upward-compatible).
 */
import {
  attendanceHierarchy,
  leaveHierarchy,
  payrollHierarchy,
  scheduleViewHierarchy,
  scheduleEditHierarchy,
  taskHierarchy,
} from '../permissions';

/**
 * Map of permission code → array of parent (broader) codes.
 * `attendance:view:self` resolves up through `attendance:view:department` → `attendance:view:all`.
 */
export const hierarchyMap: Record<string, readonly string[]> = {
  'attendance:view:self': attendanceHierarchy,
  'attendance:view:department': attendanceHierarchy.slice(1),
  'attendance:view:all': attendanceHierarchy.slice(2),

  'leave:view:self': leaveHierarchy,
  'leave:view:department': leaveHierarchy.slice(1),
  'leave:view:all': leaveHierarchy.slice(2),

  'payroll:view:self': payrollHierarchy,
  'payroll:view:all': payrollHierarchy.slice(1),

  'schedule:view:self': scheduleViewHierarchy,
  'schedule:view:department': scheduleViewHierarchy.slice(1),
  'schedule:view:all': scheduleViewHierarchy.slice(2),

  'schedule:edit:self': scheduleEditHierarchy,
  'schedule:edit:department': scheduleEditHierarchy.slice(1),
  'schedule:edit:all': scheduleEditHierarchy.slice(2),

  'tasks:view:self': taskHierarchy,
  'tasks:view': taskHierarchy.slice(1),
};
