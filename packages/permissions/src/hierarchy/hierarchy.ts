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
  // Root — sys:all grants everything (ALL is legacy)
  'sys:all': ['sys:all'],
  'ALL': ['ALL'],

  // Attendance
  'attendance:view:self': attendanceHierarchy,
  'attendance:view:department': attendanceHierarchy.slice(1),
  'attendance:view:all': attendanceHierarchy.slice(2),
  'attendance:overtime:submit': ['attendance:overtime:submit', 'attendance:overtime:approve'],
  'attendance:timesheet:view': [
    'attendance:timesheet:view',
    'attendance:timesheet:manage',
    'attendance:timesheet:approve',
    'attendance:report',
    'attendance:view:department',
    'attendance:view:all',
  ],
  'attendance:period:view': [
    'attendance:period:view',
    'attendance:period:review',
    'attendance:period:approve',
    'attendance:period:lock',
    'attendance:period:unlock',
    'attendance:period:close',
    'attendance:report',
    'attendance:view:all',
  ],

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

  // Employee
  'employee:view:self': ['employee:view:self', 'employee:view:department', 'employee:view:all', 'employee:manage'],
  'employee:view:department': ['employee:view:department', 'employee:view:all', 'employee:manage'],
  'employee:view:all': ['employee:view:all', 'employee:manage'],
  'employee:view': ['employee:view', 'employee:edit', 'employee:update:all', 'employee:delete', 'employee:manage'],
  'employee:create': ['employee:create', 'employee:edit', 'employee:update:all', 'employee:manage'],
  'employee:edit': ['employee:edit', 'employee:update:all', 'employee:manage'],
  'employee:update:self': ['employee:update:self', 'employee:edit', 'employee:update:all', 'employee:manage'],
  'employee:update:all': ['employee:update:all', 'employee:manage'],
  'employee:delete': ['employee:delete', 'employee:manage'],
  'employee:reset-password': ['employee:reset-password', 'employee:manage'],
  'employee:view:sensitive': ['employee:view:sensitive', 'employee:manage:sensitive'],

  // Offboarding
  'offboarding:view': ['offboarding:view', 'offboarding:edit'],
  'offboarding:clearance:it': ['offboarding:clearance:it', 'offboarding:edit'],
  'offboarding:clearance:hr': ['offboarding:clearance:hr', 'offboarding:edit'],
  'offboarding:clearance:finance': ['offboarding:clearance:finance', 'offboarding:edit'],
  'offboarding:clearance:manager': ['offboarding:clearance:manager', 'offboarding:edit'],
  'offboarding:clearance:security': ['offboarding:clearance:security', 'offboarding:edit'],
  'offboarding:exit-interview': ['offboarding:exit-interview', 'offboarding:edit'],
  'offboarding:complete': ['offboarding:complete', 'offboarding:edit'],
};
