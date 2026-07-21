import {
  taskMachine,
  transition,
  canTransition,
  getAvailableActions,
  findTransition,
  type TaskSnapshot,
  type TaskActor,
  type TaskState,
} from '../machine';

const creator: TaskActor = { id: 'c1', role: 'creator' };
const assignee: TaskActor = { id: 'a1', role: 'assignee' };
const manager: TaskActor = { id: 'm1', role: 'manager' };
const admin: TaskActor = { id: 'ad1', role: 'admin' };

function snap(state: TaskState, assigneeId?: string): TaskSnapshot {
  return { state, createdById: creator.id, assigneeId: assigneeId ?? null };
}

describe('valid transitions', () => {
  it.each([
    ['created -> assigned (by creator)', snap('created'), 'assign' as const, creator],
    ['created -> assigned (by manager)', snap('created'), 'assign' as const, manager],
    ['created -> cancelled (by creator)', snap('created'), 'cancel' as const, creator],
    ['assigned -> in_progress (by assignee)', snap('assigned', 'a1'), 'accept' as const, assignee],
    ['assigned -> declined (by assignee)', snap('assigned', 'a1'), 'reject' as const, assignee],
    ['assigned -> cancelled (by manager)', snap('assigned', 'a1'), 'cancel' as const, manager],
    ['assigned -> created (unassign)', snap('assigned', 'a1'), 'unassign' as const, manager],
    ['in_progress -> submitted (by assignee)', snap('in_progress', 'a1'), 'submit' as const, assignee],
    ['submitted -> completed (by creator)', snap('submitted', 'a1'), 'approve' as const, creator],
    ['submitted -> revision (by manager)', snap('submitted', 'a1'), 'request_revision' as const, manager],
    ['revision -> submitted (by assignee)', snap('revision', 'a1'), 'resubmit' as const, assignee],
  ])('allows %s', (_label, snapshot, action, actor) => {
    const result = transition(snapshot, action, actor);
    expect(result.ok).toBe(true);
  });

  it('blocks completed -> anything', () => {
    expect(getAvailableActions('completed')).toHaveLength(0);
  });

  it('blocks cancelled -> anything', () => {
    expect(getAvailableActions('cancelled')).toHaveLength(0);
  });
});

describe('invalid transitions', () => {
  it('blocks created -> approve (no such transition)', () => {
    expect(canTransition(snap('created'), 'approve', creator).ok).toBe(false);
  });

  it('blocks in_progress -> accept', () => {
    expect(canTransition(snap('in_progress'), 'accept', assignee).ok).toBe(false);
  });

  it('blocks assignee from cancelling created task', () => {
    const result = canTransition(snap('created'), 'cancel', assignee);
    expect(result.ok).toBe(false);
  });

  it('blocks creator from accepting a task', () => {
    expect(canTransition(snap('assigned'), 'accept', creator).ok).toBe(false);
  });

  it('blocks manager from submitting result', () => {
    expect(canTransition(snap('in_progress'), 'submit', manager).ok).toBe(false);
  });

  it('allows admin to do any admin-level action', () => {
    expect(canTransition(snap('assigned'), 'cancel', admin).ok).toBe(true);
  });
});

describe('transition metadata', () => {
  it('reject and request_revision require reason', () => {
    expect(findTransition('assigned', 'reject')?.requiresReason).toBe(true);
    expect(findTransition('submitted', 'request_revision')?.requiresReason?.toString()).toBeDefined();
  });

  it('submit and resubmit require result', () => {
    expect(findTransition('in_progress', 'submit')?.requiresResult).toBe(true);
    expect(findTransition('revision', 'resubmit')?.requiresResult).toBe(true);
  });

  it('covers all 8 states', () => {
    const states = new Set(taskMachine.getAllStates());
    for (const s of ['created', 'assigned', 'in_progress', 'submitted', 'revision', 'declined', 'completed', 'cancelled']) {
      expect(states.has(s)).toBe(true);
    }
  });
});

describe('available actions', () => {
  it('created offers assign and cancel', () => {
    const actions = getAvailableActions('created');
    expect(actions).toContain('assign');
    expect(actions).toContain('cancel');
  });

  it('submitted offers approve, request_revision, cancel', () => {
    const actions = getAvailableActions('submitted');
    expect(actions).toContain('approve');
    expect(actions).toContain('request_revision');
    expect(actions).toContain('cancel');
  });

  it('assigned offers accept, reject, cancel, assign, unassign', () => {
    const actions = getAvailableActions('assigned');
    expect(actions).toContain('accept');
    expect(actions).toContain('reject');
    expect(actions).toContain('cancel');
    expect(actions).toContain('assign');
    expect(actions).toContain('unassign');
  });
});
