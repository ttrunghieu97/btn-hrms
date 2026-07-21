import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import { taskKeys } from './task-queries';

describe('task queries', () => {
  it('creates correct base task query keys', () => {
    const factory = createKeyFactory('tasks');
    expect(factory.all()).toEqual(['tasks']);
    expect(factory.lists()).toEqual(['tasks', 'list']);
    expect(factory.list({ status: 'assigned' } as any)).toEqual([
      'tasks',
      'list',
      { status: 'assigned' }
    ]);
    expect(factory.details()).toEqual(['tasks', 'detail']);
    expect(factory.detail('t1')).toEqual(['tasks', 'detail', 't1']);
  });

  it('creates correct task custom keys', () => {
    expect(taskKeys.mine({ status: 'assigned' } as any)).toEqual([
      'tasks',
      'list',
      'mine',
      { status: 'assigned' }
    ]);
    expect(taskKeys.assignments('t1')).toEqual(['tasks', 'assignments', 't1']);
    expect(taskKeys.activities('t1')).toEqual(['tasks', 'activities', 't1']);
    expect(taskKeys.comments('t1')).toEqual(['tasks', 'comments', 't1']);
    expect(taskKeys.attachments('t1')).toEqual(['tasks', 'attachments', 't1']);
    expect(taskKeys.submissions('t1')).toEqual(['tasks', 'submissions', 't1']);
    expect(taskKeys.dependencies('t1')).toEqual(['tasks', 'dependencies', 't1']);
    expect(taskKeys.transitions('t1')).toEqual(['tasks', 'transitions', 't1']);
    expect(taskKeys.templates()).toEqual(['tasks', 'templates']);
  });

  it('creates analytics and performance keys', () => {
    expect(taskKeys.analytics({ departmentId: 'dept1' } as any)).toEqual([
      'tasks',
      'analytics',
      { departmentId: 'dept1' }
    ]);
    expect(taskKeys.performance({ employeeId: 'e1' } as any)).toEqual([
      'tasks',
      'performance',
      { employeeId: 'e1' }
    ]);
  });

  it('exposes the fast-changing query policy preset', () => {
    expect(queryPolicyPresets['fast-changing'].staleTime).toBeDefined();
    expect(queryPolicyPresets['fast-changing'].gcTime).toBeDefined();
  });
});
