import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { canEditRole, requiresExceptionGrantFields } from './role-access.utils';
import {
  PermissionCatalogProvider,
  usePermissionCatalog,
} from '@/features/permissions';

const mockFindAllPermissions = jest.fn();

jest.mock('@/api/generated/permissions/permissions', () => ({
  permissionsControllerFindAll: (...args: unknown[]) =>
    mockFindAllPermissions(...args),
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'u-1' } }),
}));

describe('role access UI rules & PermissionCatalogProvider (FE-008, FE-041)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('makes system_admin and super_admin roles read-only and other roles editable', () => {
    expect(canEditRole({ code: 'system_admin' })).toBe(false);
    expect(canEditRole({ code: 'super_admin' })).toBe(false);
    expect(canEditRole({ code: 'employee_base' })).toBe(true);
    expect(canEditRole({ type: 'custom' })).toBe(true);
  });

  it('requires reason and expiry for exception grants', () => {
    expect(requiresExceptionGrantFields()).toEqual(['reason', 'expiresAt']);
  });

  it('excludes sys:all from matrix catalog permissions, preserves 3-segment actionIds, and registers dynamic resources', async () => {
    mockFindAllPermissions.mockResolvedValue({
      data: [
        { code: 'sys:all', description: 'Super Admin wildcard' },
        { code: 'attendance:period:view', description: 'View attendance period' },
        { code: 'attendance:period:lock', description: 'Lock attendance period' },
        { code: 'roles:view', description: 'View roles' },
        { code: 'monitoring:view', description: 'View monitoring' },
      ],
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(PermissionCatalogProvider, null, children),
      );

    const { result } = renderHook(() => usePermissionCatalog(), { wrapper });

    await waitFor(() => {
      expect(result.current.catalog.permissions.length).toBeGreaterThan(0);
    });

    const permIds = result.current.catalog.permissions.map((p) => p.id);
    expect(permIds).not.toContain('sys:all');
    expect(permIds).toContain('attendance:period:view');
    expect(permIds).toContain('attendance:period:lock');

    const periodView = result.current.catalog.permissions.find(
      (p) => p.id === 'attendance:period:view',
    );
    const periodLock = result.current.catalog.permissions.find(
      (p) => p.id === 'attendance:period:lock',
    );
    expect(periodView?.actionId).toBe('period:view');
    expect(periodLock?.actionId).toBe('period:lock');

    const resourceIds = result.current.catalog.resources.map((r) => r.id);
    expect(resourceIds).toContain('roles');
    expect(resourceIds).toContain('monitoring');
    expect(resourceIds).not.toContain('sys');
  });
});
