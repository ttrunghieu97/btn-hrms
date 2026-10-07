import { canAccessRoute, canAccessResource, canPerformAction, PUBLIC_ROUTES } from '../index';
import { ROUTES } from '../constants/routes';
import { RESOURCES } from '../constants/resources';
import { ACTIONS } from '../constants/actions';
import { employee } from '../permissions/permissions';

describe('AuthorizationService (Default-Deny Policy)', () => {
  describe('canAccessRoute', () => {
    it('allows public routes unconditionally', () => {
      expect(canAccessRoute(PUBLIC_ROUTES.SIGN_IN, [])).toBe(true);
      expect(canAccessRoute(PUBLIC_ROUTES.UNAUTHORIZED, [])).toBe(true);
    });

    it('DENIES unregistered protected routes by default (Default-Deny)', () => {
      expect(canAccessRoute('/unregistered-secret-route', [employee.view])).toBe(false);
      expect(canAccessRoute('/random-page', ['sys:all'])).toBe(false);
    });

    it('returns true when user has at least one of anyOf permissions for registered route', () => {
      const userPermissions = [employee.viewSelf];
      expect(canAccessRoute(ROUTES.EMPLOYEES, userPermissions)).toBe(true);
    });

    it('returns false when user has none of anyOf permissions for registered route', () => {
      const userPermissions = ['leave:view'];
      expect(canAccessRoute(ROUTES.EMPLOYEES, userPermissions)).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    it('DENIES unregistered resource by default', () => {
      expect(canAccessResource('unregistered.resource', [employee.view])).toBe(false);
    });
  });

  describe('canPerformAction', () => {
    it('DENIES unregistered action by default', () => {
      expect(canPerformAction('unregistered.action', [employee.delete])).toBe(false);
    });
  });
});
