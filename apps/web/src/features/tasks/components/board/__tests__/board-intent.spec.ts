import {
  createBoardIntent,
  intentToApiPayload,
  resolveTargetColumnState,
  type TransitionIntent,
} from '../board-intent';
import { sanitizeCommentUrl } from '../../task-comments-section';
import { appendMessageToCache, type Message } from '@/features/chat';
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

  it('accepts declined -> assigned (by creator)', () => {
    const result = createBoardIntent(makeTask({ id: '1', status: 'declined' }), 'assigned', creator, { assigneeId: 'a2' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.intent.action).toBe('assign');
      expect(result.intent.toState).toBe('assigned');
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

describe('resolveTargetColumnState (FE-003)', () => {
  const taskA = makeTask({ id: 'task-uuid-1', status: 'in_progress' });
  const taskB = makeTask({ id: 'task-uuid-2', status: 'submitted' });
  const columnsRecord = {
    created: [],
    assigned: [],
    in_progress: [taskA],
    submitted: [taskB],
  };

  it('returns the column key directly when overId is a column state', () => {
    expect(resolveTargetColumnState('in_progress', columnsRecord)).toBe('in_progress');
  });

  it('resolves the owning column state when overId is a task UUID inside a non-empty column', () => {
    expect(resolveTargetColumnState('task-uuid-2', columnsRecord, [taskA, taskB])).toBe('submitted');
  });

  it('returns null when overId does not match any column or task', () => {
    expect(resolveTargetColumnState('unknown-id', columnsRecord, [taskA, taskB])).toBeNull();
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

describe('sanitizeCommentUrl (FE-014)', () => {
  it('allows https, http, and single-slash internal paths', () => {
    expect(sanitizeCommentUrl('https://example.com/file.pdf')).toBe('https://example.com/file.pdf');
    expect(sanitizeCommentUrl('http://localhost:3000/a.png')).toBe('http://localhost:3000/a.png');
    expect(sanitizeCommentUrl('/api/files/tasks/doc.pdf')).toBe('/api/files/tasks/doc.pdf');
  });

  it('blocks javascript:, data:, vbscript:, and protocol-relative // URLs', () => {
    expect(sanitizeCommentUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeCommentUrl('  JAVASCRIPT:fetch("/api") ')).toBeNull();
    expect(sanitizeCommentUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizeCommentUrl('//evil.com/payload')).toBeNull();
    expect(sanitizeCommentUrl('/\\evil.com/payload')).toBeNull();
  });
});

describe('appendMessageToCache (FE-029)', () => {
  const msg1: Message = {
    id: 'm1',
    conversationId: 'c1',
    sender: { userId: 'u1', username: 'alice' },
    senderRole: 'self',
    type: 'text',
    content: 'Hello',
    status: 'sent',
    createdAt: '2026-10-19T10:00:00Z',
  };
  const msg2: Message = {
    ...msg1,
    id: 'm2',
    content: 'World',
  };

  it('appends message to raw Orval envelope { data: Message[], status: 200 } without throwing', () => {
    const envelope = { data: [msg1], status: 200, headers: new Headers() };
    const updated = appendMessageToCache(envelope, msg2) as { data: Message[]; status: number };
    expect(updated.status).toBe(200);
    expect(updated.data).toHaveLength(2);
    expect(updated.data[1]?.id).toBe('m2');
  });

  it('deduplicates existing message IDs in nested { data: { data: Message[] } } envelope', () => {
    const nested = { data: { data: [msg1] }, status: 200 };
    const updated = appendMessageToCache(nested, msg1) as { data: { data: Message[] } };
    expect(updated.data.data).toHaveLength(1);
  });
});
