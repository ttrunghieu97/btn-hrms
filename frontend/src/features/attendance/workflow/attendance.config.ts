/**
 * Attendance exception/correction workflow configuration.
 *
 * Pure domain config over the generic workflow engine.
 * ZERO engine logic — this is data, not code.
 *
 * Covers:
 * - Exception resolution (pending → resolved/closed)
 * - Correction request (draft → pending → approved/rejected)
 *
 * 3rd domain validation: if this runs on createMachine() without
 * engine changes, the platform is confirmed.
 */

import { createMachine, type WorkflowActor } from '@/lib/workflow/machine';

/* ------------------------------------------------------------------ */
/* Domain types                                                         */
/* ------------------------------------------------------------------ */

export type AttendanceState = 'draft' | 'pending' | 'resolved' | 'closed' | 'approved' | 'rejected';
export type AttendanceAction = 'submit' | 'resolve' | 'close' | 'approve' | 'reject' | 'cancel';

/* ------------------------------------------------------------------ */
/* Roles                                                                 */
/* ------------------------------------------------------------------ */

export const ATTENDANCE_ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  HR: 'hr',
} as const;

/* ------------------------------------------------------------------ */
/* Transition definitions (pure data)                                   */
/* ------------------------------------------------------------------ */

const ATTENDANCE_TRANSITIONS = [
  // Exception flow: pending → resolved | closed
  { from: 'pending' as AttendanceState, action: 'resolve' as AttendanceAction, to: 'resolved' as AttendanceState, allowedRoles: [ATTENDANCE_ROLES.MANAGER, ATTENDANCE_ROLES.HR], requiresReason: true },
  { from: 'pending' as AttendanceState, action: 'close' as AttendanceAction, to: 'closed' as AttendanceState, allowedRoles: [ATTENDANCE_ROLES.MANAGER, ATTENDANCE_ROLES.HR], requiresReason: true },

  // Correction flow: draft → pending → approved | rejected
  { from: 'draft' as AttendanceState, action: 'submit' as AttendanceAction, to: 'pending' as AttendanceState, allowedRoles: [ATTENDANCE_ROLES.EMPLOYEE] },
  { from: 'draft' as AttendanceState, action: 'cancel' as AttendanceAction, to: 'closed' as AttendanceState, allowedRoles: [ATTENDANCE_ROLES.EMPLOYEE] },

  // Review
  { from: 'pending' as AttendanceState, action: 'approve' as AttendanceAction, to: 'approved' as AttendanceState, allowedRoles: [ATTENDANCE_ROLES.MANAGER, ATTENDANCE_ROLES.HR] },
  { from: 'pending' as AttendanceState, action: 'reject' as AttendanceAction, to: 'rejected' as AttendanceState, allowedRoles: [ATTENDANCE_ROLES.MANAGER, ATTENDANCE_ROLES.HR], requiresReason: true },

  // Terminal state recovery (admin override)
  { from: 'resolved' as AttendanceState, action: 'cancel' as AttendanceAction, to: 'pending' as AttendanceState, allowedRoles: [ATTENDANCE_ROLES.HR], requiresReason: true },
  { from: 'rejected' as AttendanceState, action: 'submit' as AttendanceAction, to: 'pending' as AttendanceState, allowedRoles: [ATTENDANCE_ROLES.EMPLOYEE] },
] as const;

/* ------------------------------------------------------------------ */
/* Machine instance                                                     */
/* ------------------------------------------------------------------ */

export const attendanceMachine = createMachine(ATTENDANCE_TRANSITIONS);

/* ------------------------------------------------------------------ */
/* Convenience helpers                                                  */
/* ------------------------------------------------------------------ */

export const ATTENDANCE_STATES: AttendanceState[] = [
  'draft', 'pending', 'resolved', 'closed', 'approved', 'rejected',
];

export function getAvailableActions(state: AttendanceState) {
  return attendanceMachine.getAvailableActions(state) as AttendanceAction[];
}

export function canTransition(state: AttendanceState, action: AttendanceAction, actor: WorkflowActor) {
  return attendanceMachine.canTransition({ state }, action, actor);
}
