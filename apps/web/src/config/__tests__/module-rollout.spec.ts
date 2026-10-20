import {
  MODULE_ROLLOUT_REGISTRY,
  PROTECTED_MODULE_PATHS,
  findModuleByPath,
  getDisabledModulePaths,
  isDisabledModulePath,
  isModuleEnabled,
  isModuleNavVisible,
  isProtectedPath,
  isRouteInVisibleModule,
  resolveEnabledModuleIds,
} from '../module-rollout';
import { generateNav } from '@/features/authorization/utils/nav-generator';

describe('module-rollout centralized registry', () => {
  const originalEnabledModules = process.env.NEXT_PUBLIC_ENABLED_MODULES;
  const originalEnabledNavGroups = process.env.ENABLED_NAV_GROUPS;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ENABLED_MODULES;
    delete process.env.ENABLED_NAV_GROUPS;
    jest.resetModules();
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_ENABLED_MODULES = originalEnabledModules;
    process.env.ENABLED_NAV_GROUPS = originalEnabledNavGroups;
  });
  it('enables employees, attendance, and account routes by default', () => {
    const enabled = resolveEnabledModuleIds('');
    expect(Array.from(enabled).sort()).toEqual([
      'account',
      'attendance',
      'employees',
    ]);

    expect(isModuleEnabled('employees', '')).toBe(true);
    expect(isModuleEnabled('attendance', '')).toBe(true);
    expect(isModuleEnabled('account', '')).toBe(true);
    expect(isModuleEnabled('leave', '')).toBe(false);
    expect(isModuleEnabled('payroll', '')).toBe(false);
  });

  it('shows only employees and attendance in main navigation by default (account lives in SidebarFooter)', () => {
    expect(isModuleNavVisible('employees', '')).toBe(true);
    expect(isModuleNavVisible('attendance', '')).toBe(true);
    expect(isModuleNavVisible('account', '')).toBe(false);
    expect(isModuleNavVisible('leave', '')).toBe(false);

    const { navGroups } = require('../nav-config') as typeof import('../nav-config');
    const visibleNavUrls = navGroups
      .flatMap((g) => g.items)
      .filter((item) => item.visible)
      .map((item) => item.url);

    expect(visibleNavUrls).toEqual(['/employees', '/attendance']);
  });

  it('derives all 25 protected top-level paths and 20 default disabled module paths for proxy.ts', () => {
    expect(PROTECTED_MODULE_PATHS).toHaveLength(25);
    expect(isProtectedPath('/employees')).toBe(true);
    expect(isProtectedPath('/employees/123')).toBe(true);
    expect(isProtectedPath('/account/profile')).toBe(true);
    expect(isProtectedPath('/auth/sign-in')).toBe(false);

    const defaultDisabled = getDisabledModulePaths('');
    expect(defaultDisabled).toHaveLength(20);
    expect(isDisabledModulePath('/employees', '')).toBe(false);
    expect(isDisabledModulePath('/attendance/history', '')).toBe(false);
    expect(isDisabledModulePath('/account/profile', '')).toBe(false);
    expect(isDisabledModulePath('/change-password', '')).toBe(false);
    expect(isDisabledModulePath('/leave/requests', '')).toBe(true);
    expect(isDisabledModulePath('/payroll', '')).toBe(true);
  });

  it('supports progressive module rollout via comma-separated env override and backend alias "workforce"', () => {
    const rollout = 'workforce,attendance,leave,organization';

    expect(isModuleEnabled('employees', rollout)).toBe(true);
    expect(isModuleEnabled('attendance', rollout)).toBe(true);
    expect(isModuleEnabled('leave', rollout)).toBe(true);
    expect(isModuleEnabled('organization', rollout)).toBe(true);
    // Core account routes remain accessible even when not explicitly listed
    expect(isModuleEnabled('account', rollout)).toBe(true);
    expect(isModuleEnabled('payroll', rollout)).toBe(false);

    expect(isDisabledModulePath('/leave/requests', rollout)).toBe(false);
    expect(isDisabledModulePath('/organization/departments', rollout)).toBe(false);
    expect(isDisabledModulePath('/payroll', rollout)).toBe(true);
  });

  it('supports wildcard "*" or "all" to enable all modules', () => {
    const enabledAll = resolveEnabledModuleIds('*');
    expect(enabledAll.size).toBe(MODULE_ROLLOUT_REGISTRY.length);
    expect(getDisabledModulePaths('*')).toEqual([]);
    expect(isModuleNavVisible('payroll', 'all')).toBe(true);
    expect(isModuleNavVisible('account', 'all')).toBe(false);
  });

  it('synchronizes with generateNav when onlyEnabledModules is true', () => {
    const superAdmin = { isSuperAdmin: true, permissions: ['sys:all'] };

    const defaultRolloutNav = generateNav(superAdmin, {
      onlyEnabledModules: true,
      rolloutEnvOverride: '',
    });
    const defaultUrls = defaultRolloutNav.flatMap((g) =>
      g.items.map((i) => i.url),
    );
    expect(defaultUrls).toEqual(['/employees', '/attendance']);

    const expandedRolloutNav = generateNav(superAdmin, {
      onlyEnabledModules: true,
      rolloutEnvOverride: 'employees,attendance,leave,payroll',
    });
    const expandedUrls = expandedRolloutNav.flatMap((g) =>
      g.items.map((i) => i.url),
    );
    expect(expandedUrls).toEqual([
      '/employees',
      '/attendance',
      '/leave',
      '/payroll',
    ]);
  });

  it('maps subpaths accurately to their owning module', () => {
    expect(findModuleByPath('/recruitment/requisitions')?.id).toBe('recruitment');
    expect(findModuleByPath('/asset-management/catalog')?.id).toBe('asset-management');
    expect(findModuleByPath('/chat')?.id).toBe('tasks');
    expect(isRouteInVisibleModule('/recruitment/requisitions', '')).toBe(false);
    expect(isRouteInVisibleModule('/recruitment/requisitions', 'recruitment')).toBe(true);
  });
});
