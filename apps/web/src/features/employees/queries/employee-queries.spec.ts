import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';

describe('employee queries', () => {
  it('creates correct query keys', () => {
    const factory = createKeyFactory<{ page: number }>('employees');
    expect(factory.all()).toEqual(['employees']);
    expect(factory.lists()).toEqual(['employees', 'list']);
    expect(factory.list({ page: 1 })).toEqual(['employees', 'list', { page: 1 }]);
    expect(factory.details()).toEqual(['employees', 'detail']);
    expect(factory.detail('123')).toEqual(['employees', 'detail', '123']);
  });

  it('exposes the employee query policy preset', () => {
    expect(queryPolicyPresets.employees.staleTime).toBe(60_000);
    expect(queryPolicyPresets.employees.gcTime).toBe(600_000);
  });
});
