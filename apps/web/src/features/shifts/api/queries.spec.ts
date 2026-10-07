import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';

describe('shift queries', () => {
  it('creates correct shift template query keys', () => {
    const key = createKeyFactory('shift-templates');
    expect(key.all()).toEqual(['shift-templates']);
    expect(key.lists()).toEqual(['shift-templates', 'list']);
    expect(key.list({ status: 'active' } as any)).toEqual([
      'shift-templates',
      'list',
      { status: 'active' }
    ]);
  });

  it('creates correct shift assignment query keys', () => {
    const key = createKeyFactory('shift-assignments');
    expect(key.all()).toEqual(['shift-assignments']);
    expect(key.lists()).toEqual(['shift-assignments', 'list']);
    expect(key.list({ employeeId: 'e1' } as any)).toEqual([
      'shift-assignments',
      'list',
      { employeeId: 'e1' }
    ]);
  });

  it('creates correct roster query keys', () => {
    const key = createKeyFactory('shift-roster');
    expect(key.all()).toEqual(['shift-roster']);
    expect(key.list({ from: '2026-01-01', to: '2026-01-07' } as any)).toEqual([
      'shift-roster',
      'list',
      { from: '2026-01-01', to: '2026-01-07' }
    ]);
  });

  it('uses the default query policy preset', () => {
    expect(queryPolicyPresets['static'].staleTime).toBeDefined();
  });
});
