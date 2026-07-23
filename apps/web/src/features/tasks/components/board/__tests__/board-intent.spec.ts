import { createBoardIntent, intentToApiPayload, type TransitionIntent } from '../board-intent';
import type { Task } from '../../../utils/task-types';
import type { TaskActor } from '../../../workflow/machine';

const assignee: TaskActor = { id: 'a1', role: 'assignee' };
const creator: TaskActor = { id: 'c1', role: 'creator' };

function makeTask(overrides: Partial<Task> & { id: string; status: string }): Task {
  return { title: 'T', ...overrides } as Task;
}

describe('createBoardIntent', () => {
  it('accepts created -> assigned (by creator)', () => {
    const result = createBoardIntent(makeTask({ id: '1', status: 'created' }), 'assigned', creator, { assigneeId: 'a1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.intent.action).toBe('assign');
      expect(result.intent.toState).toBe('assigned');
    }
  });

  it('accepts assigned -> in_progress (by assignee)', () => {
    const result = createBoardIntent(makeTask({ id: '1', status: 'assigned' }), 'in_progress', assignee);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.intent.action).toBe('accept');
    }
  });

  it('rejects room-temperature mapping', () => {
    const result = createBoardIntent(makeTask({ id: '1', status: 'created' }), 'completed', creator);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('No transition');
  });

  it('rejects drag to a state that has no board mapping (cancelled)', () => {
    const result = createBoardIntent(makeTask({ id: '1', status: 'created' }), 'cancelled', assignee);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('No transition');
  });

  it('rejects reason-required action without reason', () => {
    const result = createBoardIntent(makeTask({ id: '1', status: 'submitted' }), 'revision', creator);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('requires a reason');
  });

  it('accepts reason-required action with reason', () => {
    const result = createBoardIntent(makeTask({ id: '1', status: 'submitted' }), 'revision', creator, { reason: 'Fix formatting' });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid fromState', () => {
    const result = createBoardIntent(makeTask({ id: '1', status: 'bogus' }), 'assigned', creator);
    expect(result.ok).toBe(false);
  });
});

describe('intentToApiPayload', () => {
  it('produces correct payload for direct transition', () => {
    const intent: TransitionIntent = {
      taskId: '1',
      fromState: 'in_progress',
      action: 'submit' as const,
      toState: 'submitted',
    };
    const payload = intentToApiPayload(intent);
    expect(payload.transition).toBe('submit');
    expect(payload.reason).toBeUndefined();
  });

  it('includes reason when present', () => {
    const intent: TransitionIntent = {
      taskId: '1',
      fromState: 'submitted',
      action: 'request_revision' as const,
      toState: 'revision',
      metadata: { reason: 'Fix it' },
    };
    const payload = intentToApiPayload(intent);
    expect(payload.reason).toBe('Fix it');
  });
});
