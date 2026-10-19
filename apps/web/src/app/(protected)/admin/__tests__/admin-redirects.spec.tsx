import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { redirect, useSearchParams } from 'next/navigation';
import AdminPage from '../page';
import AdminPermissionsPage from '../permissions/page';
import AdminAuditPage from '../audit/page';
import AdminIntegrationsPage from '../integrations/page';
import AdminSettingsPage from '../settings/page';
import AdministrationAuditLogsPage from '../../administration/audit-logs/page';
import { canAccessRoute } from '@/shared/authorization';
import { useAuditLogsQuery } from '@/features/audit';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/features/audit', () => {
  const actual = jest.requireActual('@/features/audit');
  return {
    ...actual,
    useAuditLogsQuery: jest.fn(() => ({
      data: [],
      isLoading: false,
    })),
  };
});

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('Admin routes redirect & authorization behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
  });

  it('redirects /admin/audit to /administration/audit-logs without query parameters', async () => {
    await AdminAuditPage({});
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith('/administration/audit-logs');
  });

  it('redirects /admin/audit to /administration/audit-logs and preserves single and multi-value query parameters', async () => {
    await AdminAuditPage({
      searchParams: Promise.resolve({
        search: 'admin',
        action: 'permission',
        period: '30d',
        tag: ['security', 'rbac'],
        empty: undefined,
      }),
    });

    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith(
      '/administration/audit-logs?search=admin&action=permission&period=30d&tag=security&tag=rbac',
    );
  });

  it('redirects /admin to /administration/users and /admin/permissions to /administration/roles preserving query strings', async () => {
    await AdminPage({
      searchParams: Promise.resolve({ page: '2', name: 'nguyen' }),
    });
    expect(redirect).toHaveBeenCalledWith('/administration/users?page=2&name=nguyen');

    await AdminPermissionsPage({
      searchParams: Promise.resolve({ tab: 'custom' }),
    });
    expect(redirect).toHaveBeenCalledWith('/administration/roles?tab=custom');
  });

  it('renders /administration/audit-logs without redirecting (no redirect loop) and applies URL query parameters', () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams('search=sysadmin&action=role&period=24h'),
    );

    renderWithQueryClient(<AdministrationAuditLogsPage />);

    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByText('Audit Explorer')).toBeInTheDocument();
    expect(useAuditLogsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 100,
        search: 'sysadmin',
        action: 'role',
        from: expect.any(String),
      }),
    );
  });

  it('keeps /admin/integrations and /admin/settings intact without redirecting', () => {
    const { unmount } = renderWithQueryClient(<AdminIntegrationsPage />);
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByText('Integration Management')).toBeInTheDocument();
    unmount();

    renderWithQueryClient(<AdminSettingsPage />);
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByText('Configuration Center')).toBeInTheDocument();
  });

  it('enforces matching route permissions on /admin/audit and /administration/audit-logs and blocks unauthorized users', () => {
    // Users with users:view can access both /admin/audit and /administration/audit-logs
    expect(canAccessRoute('/admin/audit', ['users:view'])).toBe(true);
    expect(canAccessRoute('/administration/audit-logs', ['users:view'])).toBe(true);

    // Unauthorized users (e.g. basic employee without users:view) are denied on both
    expect(canAccessRoute('/admin/audit', ['employees:view:self'])).toBe(false);
    expect(canAccessRoute('/administration/audit-logs', ['employees:view:self'])).toBe(false);
    expect(canAccessRoute('/administration/audit-logs', [])).toBe(false);

    // /admin/integrations and /admin/settings require users:edit
    expect(canAccessRoute('/admin/integrations', ['users:edit'])).toBe(true);
    expect(canAccessRoute('/admin/settings', ['users:edit'])).toBe(true);
    expect(canAccessRoute('/admin/integrations', ['users:view'])).toBe(false);
    expect(canAccessRoute('/admin/settings', ['users:view'])).toBe(false);
  });
});
