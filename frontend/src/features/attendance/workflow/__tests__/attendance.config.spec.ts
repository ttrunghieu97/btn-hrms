import {
  attendanceMachine,
  getAvailableActions,
  canTransition,
  ATTENDANCE_STATES,
  ATTENDANCE_ROLES,
  type AttendanceState,
  type AttendanceAction,
} from '../attendance.config';
import type { WorkflowActor } from '@/lib/workflow/machine';

const employee: WorkflowActor = { id: 'e1', role: ATTENDANCE_ROLES.EMPLOYEE };
const manager: WorkflowActor = { id: 'm1', role: ATTENDANCE_ROLES.MANAGER };
const hr: WorkflowActor = { id: 'h1', role: ATTENDANCE_ROLES.HR };

describe('Attendance workflow machine', () => {
  describe('states', () => {
    it('has 6 defined states', () => {
      expect(ATTENDANCE_STATES).toEqual(
        expect.arrayContaining(['draft', 'pending', 'resolved', 'closed', 'approved', 'rejected'])
      );
    });
  });

  describe('draft', () => {
    it('employee can submit draft → pending', () => {
      const r = canTransition('draft', 'submit', employee);
      expect(r.ok).toBe(true);
    });

    it('employee can cancel draft → closed', () => {
      const r = canTransition('draft', 'cancel', employee);
      expect(r.ok).toBe(true);
    });

    it('manager cannot submit on behalf', () => {
      const r = canTransition('draft', 'submit', manager);
      expect(r.ok).toBe(false);
    });
  });

  describe('pending exception', () => {
    it('manager can resolve pending → resolved', () => {
      const r = canTransition('pending', 'resolve', manager);
      expect(r.ok).toBe(true);
    });

    it('hr can close pending → closed', () => {
      const r = canTransition('pending', 'close', hr);
      expect(r.ok).toBe(true);
    });

    it('employee cannot resolve', () => {
      const r = canTransition('pending', 'resolve', employee);
      expect(r.ok).toBe(false);
    });

    it('manager can approve correction', () => {
      const r = canTransition('pending', 'approve', manager);
      expect(r.ok).toBe(true);
    });

    it('reject requires reason', () => {
      const t = attendanceMachine.find('pending', 'reject');
      expect(t?.requiresReason).toBe(true);
    });
  });

  describe('terminal state recovery', () => {
    it('hr can reopen resolved → pending', () => {
      const r = canTransition('resolved', 'cancel', hr);
      expect(r.ok).toBe(true);
    });

    it('employee can resubmit rejected → pending', () => {
      const r = canTransition('rejected', 'submit', employee);
      expect(r.ok).toBe(true);
    });

    it('manager cannot reopen resolved', () => {
      const r = canTransition('resolved', 'cancel', manager);
      expect(r.ok).toBe(false);
    });
  });

  describe('blocked transitions', () => {
    it('cannot resolve a draft', () => {
      const r = canTransition('draft', 'resolve', hr);
      expect(r.ok).toBe(false);
    });

    it('cannot approve from closed', () => {
      const r = canTransition('closed', 'approve', hr);
      expect(r.ok).toBe(false);
    });
  });

  describe('machine metadata', () => {
    it('all states are discoverable', () => {
      const all = attendanceMachine.getAllStates();
      for (const s of ATTENDANCE_STATES) {
        expect(all).toContain(s);
      }
    });

    it('all actions are discoverable', () => {
      const all = attendanceMachine.getAllActions();
      expect(all).toContain('submit');
      expect(all).toContain('resolve');
      expect(all).toContain('close');
      expect(all).toContain('approve');
      expect(all).toContain('reject');
      expect(all).toContain('cancel');
    });
  });
});
