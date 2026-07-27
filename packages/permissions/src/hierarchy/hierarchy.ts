/**
 * Centralized permission hierarchy definitions.
 * Each entry: most-specific → least-specific (upward-compatible).
 *
 * `sys:all` is the root permission — it appears as a single-entry chain,
 * signaling that `hasPermission()` should treat it as granting every code.
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
 * `sys:all` is the root — grants every permission via resolver logic.
 */
export const hierarchyMap: Record<string, readonly string[]> = {
  // Root — sys:all grants everything
  'sys:all': ['sys:all'],

  // Attendance
  'attendance:view:self': attendanceHierarchy,
  'attendance:view:department': attendanceHierarchy.slice(1),
  'attendance:view:all': attendanceHierarchy.slice(2),

  // Leave
  'leave:view:self': leaveHierarchy,
  'leave:view:department': leaveHierarchy.slice(1),
  'leave:view:all': leaveHierarchy.slice(2),

  // Payroll
  'payroll:view:self': payrollHierarchy,
  'payroll:view:all': payrollHierarchy.slice(1),

  // Schedule view
  'schedule:view:self': scheduleViewHierarchy,
  'schedule:view:department': scheduleViewHierarchy.slice(1),
  'schedule:view:all': scheduleViewHierarchy.slice(2),

  // Schedule edit
  'schedule:edit:self': scheduleEditHierarchy,
  'schedule:edit:department': scheduleEditHierarchy.slice(1),
  'schedule:edit:all': scheduleEditHierarchy.slice(2),

  // Tasks
  'tasks:view:self': taskHierarchy,
  'tasks:view': taskHierarchy.slice(1),
};
