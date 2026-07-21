import {
  checkUnknownStates,
  checkOrphanStates,
  checkCompletedAssignee,
  validateBoard,
  diagnoseBoard,
} from '../board-validation';
import type { Task } from '../../../utils/task-types';

function makeTask(overrides: Partial<Task> & { id: string; status: string }): Task {
  return {
    title: 'Test',
    status: 'created',
    ...overrides,
  } as Task;
}

describe('checkUnknownStates', () => {
  it('passes tasks with known states', () => {
    const tasks = [
      makeTask({ id: '1', status: 'created' }),
      makeTask({ id: '2', status: 'in_progress' }),
      makeTask({ id: '3', status: 'completed' }),
    ];
    expect(checkUnknownStates(tasks)).toHaveLength(0);
  });

  it('flags tasks with unknown states', () => {
    const tasks = [makeTask({ id: '1', status: 'archived' })];
    const issues = checkUnknownStates(tasks);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].taskId).toBe('1');
  });
});

describe('checkOrphanStates', () => {
  it('passes tasks reachable by transition', () => {
    const tasks = [
      makeTask({ id: '1', status: 'created' }),
      makeTask({ id: '2', status: 'submitted' }),
      makeTask({ id: '3', status: 'completed' }),
    ];
    expect(checkOrphanStates(tasks)).toHaveLength(0);
  });

  it('does not flag reachable states', () => {
    const tasks = [makeTask({ id: '1', status: 'declined' })];
    expect(checkOrphanStates(tasks)).toHaveLength(0);
  });

  it('flags truly orphan state "foobar"', () => {
    const tasks = [makeTask({ id: '1', status: 'foobar' })];
    const issues = checkOrphanStates(tasks);
    expect(issues).toHaveLength(1);
  });
});

describe('checkCompletedAssignee', () => {
  it('passes completed with no assignee', () => {
    const tasks = [makeTask({ id: '1', status: 'completed', assignee: null })];
    expect(checkCompletedAssignee(tasks)).toHaveLength(0);
  });

  it('warns completed with assignee', () => {
    const tasks = [makeTask({ id: '1', status: 'completed', assignee: { id: 'a1', fullName: 'A' } })];
    const issues = checkCompletedAssignee(tasks);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warn');
  });
});

describe('validateBoard', () => {
  it('returns empty for healthy board', () => {
    const tasks = [
      makeTask({ id: '1', status: 'created' }),
      makeTask({ id: '2', status: 'completed', assignee: null }),
    ];
    expect(validateBoard(tasks)).toHaveLength(0);
  });

  it('aggregates multiple issues', () => {
    const tasks = [
      makeTask({ id: '1', status: 'bogus' }),
      makeTask({ id: '2', status: 'completed', assignee: { id: 'a1', fullName: 'A' } }),
    ];
    expect(validateBoard(tasks).length).toBeGreaterThanOrEqual(2);
  });
});

describe('diagnoseBoard', () => {
  it('produces a correct summary for healthy board', () => {
    const tasks = [
      makeTask({ id: '1', status: 'created' }),
      makeTask({ id: '2', status: 'in_progress' }),
    ];
    const d = diagnoseBoard(tasks);
    expect(d.totalTasks).toBe(2);
    expect(d.healthy).toBe(true);
    expect(d.stateDistribution.created).toBe(1);
    expect(d.stateDistribution.in_progress).toBe(1);
  });

  it('flags unhealthy board', () => {
    const tasks = [makeTask({ id: '1', status: 'alien_state' })];
    const d = diagnoseBoard(tasks);
    expect(d.healthy).toBe(false);
    expect(d.issues.length).toBeGreaterThan(0);
  });
});
