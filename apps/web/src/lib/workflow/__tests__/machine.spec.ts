import { createMachine, type WorkflowTransitionDef, type WorkflowSnapshot, type WorkflowActor } from '../machine';

describe('createMachine', () => {
  const LEAVE_TRANSITIONS: WorkflowTransitionDef[] = [
    { from: 'draft', action: 'submit', to: 'pending', allowedRoles: ['employee'] },
    { from: 'pending', action: 'approve', to: 'approved', allowedRoles: ['manager', 'hr'] },
    { from: 'pending', action: 'reject', to: 'rejected', allowedRoles: ['manager', 'hr'], requiresReason: true },
    { from: 'pending', action: 'cancel', to: 'cancelled', allowedRoles: ['employee'] },
    { from: 'approved', action: 'cancel', to: 'cancelled', allowedRoles: ['employee', 'manager', 'hr'], requiresReason: true },
  ];

  const machine = createMachine(LEAVE_TRANSITIONS);
  const employee: WorkflowActor = { id: 'e1', role: 'employee' };
  const manager: WorkflowActor = { id: 'm1', role: 'manager' };

  it('finds a valid transition', () => {
    const t = machine.find('draft', 'submit');
    expect(t).toBeDefined();
    expect(t?.to).toBe('pending');
  });

  it('returns undefined for invalid transition', () => {
    const t = machine.find('draft', 'approve');
    expect(t).toBeUndefined();
  });

  it('allows valid transition with correct role', () => {
    const result = machine.canTransition({ state: 'draft' }, 'submit', employee);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.toState).toBe('pending');
  });

  it('blocks transition with wrong role', () => {
    const result = machine.canTransition({ state: 'draft' }, 'submit', manager);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('guard_denied');
  });

  it('blocks non-existent transition', () => {
    const result = machine.canTransition({ state: 'draft' }, 'approve', employee);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_action');
  });

  it('returns available actions', () => {
    const actions = machine.getAvailableActions('pending');
    expect(actions).toContain('approve');
    expect(actions).toContain('reject');
    expect(actions).toContain('cancel');
  });

  it('returns empty actions for terminal state (no outgoing transitions)', () => {
    expect(machine.getAvailableActions('rejected')).toHaveLength(0);
    expect(machine.getAvailableActions('cancelled')).toHaveLength(0);
  });

  it('gets next state', () => {
    expect(machine.getNextState('pending', 'approve')).toBe('approved');
    expect(machine.getNextState('pending', 'reject')).toBe('rejected');
    expect(machine.getNextState('pending', 'cancel')).toBe('cancelled');
  });

  it('returns null for non-existent next state', () => {
    expect(machine.getNextState('draft', 'approve')).toBeNull();
  });

  it('lists all states', () => {
    const states = machine.getAllStates();
    expect(states).toContain('draft');
    expect(states).toContain('pending');
    expect(states).toContain('approved');
    expect(states).toContain('rejected');
    expect(states).toContain('cancelled');
  });

  it('lists all actions', () => {
    const actions = machine.getAllActions();
    expect(actions).toContain('submit');
    expect(actions).toContain('approve');
    expect(actions).toContain('reject');
    expect(actions).toContain('cancel');
  });

  it('does not mutate engine state between calls', () => {
    const r1 = machine.canTransition({ state: 'pending' }, 'approve', employee);
    expect(r1.ok).toBe(false);

    const r2 = machine.canTransition({ state: 'pending' }, 'approve', manager);
    expect(r2.ok).toBe(true);
  });
});
