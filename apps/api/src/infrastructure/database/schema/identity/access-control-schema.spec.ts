import {
  accessAuditLogs,
  accessDenials,
  accessGrants,
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from './tables';

describe('access-control schema exports', () => {
  it('exports canonical access-control tables', () => {
    expect(permissions).toBeDefined();
    expect(roles).toBeDefined();
    expect(rolePermissions).toBeDefined();
    expect(userRoles).toBeDefined();
    expect(accessGrants).toBeDefined();
    expect(accessDenials).toBeDefined();
    expect(accessAuditLogs).toBeDefined();
  });
});
