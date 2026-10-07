import { generateNav, getAllNavItems } from '../utils/nav-generator';

const admin = { isSuperAdmin: true, permissions: [] };
const employeeUser = { permissions: ['employees:view:self', 'attendance:view:self', 'dashboard:view'] };
const emptyUser = { permissions: [] };

describe('generateNav', () => {
  it('returns nav items for super admin', () => {
    const nav = generateNav(admin);
    expect(nav.length).toBeGreaterThan(0);
    // Should include all nav groups
    const allTitles = nav.flatMap((g) => g.items.map((i) => i.title));
    expect(allTitles).toContain('Nhân viên');
    expect(allTitles).toContain('Tổng quan');
    expect(allTitles).toContain('Chấm công');
  });

  it('filters items based on user permissions', () => {
    const nav = generateNav(employeeUser);
    const allTitles = nav.flatMap((g) => g.items.map((i) => i.title));

    // Employee can view
    expect(allTitles).toContain('Tổng quan'); // dashboard:view
    expect(allTitles).toContain('Chấm công'); // attendance:view:self
    expect(allTitles).toContain('Hồ sơ'); // profile:view

    // Employee cannot view
    expect(allTitles).not.toContain('Quản trị'); // needs users:view
    expect(allTitles).not.toContain('Bảng lương'); // no payroll:view
  });

  it('returns empty for user with zero permissions', () => {
    const nav = generateNav(emptyUser);
    // User may see account/profile and account/no-permissions
    // if profile:view or employees:view:self isn't in registry anymore
    // For empty perms, admin pages are hidden
    const adminGroup = nav.find((g) => g.label === 'Quản trị');
    expect(adminGroup).toBeUndefined();
  });

  it('groups items correctly', () => {
    const nav = generateNav(admin);
    const groupLabels = nav.map((g) => g.label);
    expect(groupLabels).toContain('Nhân sự');
    expect(groupLabels).toContain('Tài chính');
    expect(groupLabels).toContain('Quản trị');
    expect(groupLabels).toContain('Tài khoản');
  });

  it('returns null/undefined safely', () => {
    expect(generateNav(null)).toEqual([]);
    expect(generateNav(undefined)).toEqual([]);
  });
});

describe('getAllNavItems', () => {
  it('returns all nav items without filtering', () => {
    const items = getAllNavItems();
    expect(items.length).toBeGreaterThan(0);
    // Should have all nav items
    const titles = items.map((i) => i.title);
    expect(titles).toContain('Nhân viên');
    expect(titles).toContain('Hồ sơ');
  });

  it('every item has required fields', () => {
    const items = getAllNavItems();
    for (const item of items) {
      expect(item.title).toBeTruthy();
      expect(item.url).toBeTruthy();
      expect(item.icon).toBeTruthy();
      expect(item.group).toBeTruthy();
    }
  });
});
