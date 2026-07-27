import { parsePermissionCode } from './permission-code';

describe('parsePermissionCode', () => {
  it('parses domain action and scope from canonical permission code', () => {
    expect(parsePermissionCode('employees:view:department')).toEqual({
      domain: 'employees',
      action: 'view',
      scope: 'department',
    });
  });

  it('parses sys all as global permission', () => {
    expect(parsePermissionCode('sys:all')).toEqual({
      domain: 'sys',
      action: 'all',
      scope: null,
    });
  });

  it('rejects malformed permission codes', () => {
    // 2-part codes are valid (domain:action, no scope)
    expect(parsePermissionCode('employees:view')).toEqual({
      domain: 'employees',
      action: 'view',
      scope: null,
    });
    expect(() => parsePermissionCode('employees:view:')).toThrow('Invalid permission code');
    expect(() => parsePermissionCode('employees:view:team')).toThrow('Invalid permission scope');
  });
});
