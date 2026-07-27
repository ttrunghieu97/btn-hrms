import { canAccessRoute, canAccessResource, canPerformAction } from '../index';
import { ROUTES } from '../constants/routes';
import { RESOURCES } from '../constants/resources';
import { ACTIONS } from '../constants/actions';

describe('Frontend Component Adapters (PR-3 Logic)', () => {
  it('CanAccessRoute validates routes using user permissions', () => {
    const permissions = ['employee:view'];
    expect(canAccessRoute(ROUTES.EMPLOYEES, permissions)).toBe(true);
    expect(canAccessRoute(ROUTES.EMPLOYEES_NEW, permissions)).toBe(false);
  });

  it('ResourceGuard evaluates resource access rules', () => {
    const permissions = ['employee:view'];
    expect(canAccessResource(RESOURCES.EMPLOYEE.DOCUMENTS, permissions)).toBe(true);
    expect(canAccessResource(RESOURCES.EMPLOYEE.COMPENSATION, permissions)).toBe(false);
  });

  it('ActionGuard evaluates action access rules', () => {
    const permissions = ['employee:delete'];
    expect(canPerformAction(ACTIONS.EMPLOYEE.DELETE, permissions)).toBe(true);
    expect(canPerformAction(ACTIONS.EMPLOYEE.CREATE, permissions)).toBe(false);
  });
});
