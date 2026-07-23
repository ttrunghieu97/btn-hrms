import type { UserMeResponseDto } from '@/api/generated/model';
import type { NavItem } from '@/types';
import { canAccessNavItem, filterNavItems } from './use-nav';

const makeUser = (permissions: string[]): UserMeResponseDto => ({
  id: 'user-1',
  username: 'tester',
  email: 'tester@example.com',
  isSuperAdmin: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  permissions,
});

describe('use-nav helpers', () => {
  const publicItem: NavItem = {
    title: 'Dashboard',
    url: '/',
    items: [],
  };

  const restrictedItem: NavItem = {
    title: 'Role Management',
    url: '/role-management',
    items: [],
    access: { permissions: ['users:edit'] },
  };

  it('allows items without access metadata', () => {
    expect(canAccessNavItem(publicItem, null)).toBe(true);
  });

  it('denies restricted items when permission missing', () => {
    expect(canAccessNavItem(restrictedItem, makeUser(['users:view']))).toBe(false);
  });

  it('allows restricted items when permission exists', () => {
    expect(canAccessNavItem(restrictedItem, makeUser(['users:edit']))).toBe(true);
  });

  it('filters unauthorized items from nav tree', () => {
    const items = filterNavItems([publicItem, restrictedItem], makeUser(['users:view']));
    expect(items).toEqual([publicItem]);
  });

  it('keeps disabled coming soon items visible without granting access', () => {
    const comingSoonItem: NavItem = {
      title: 'Attendance',
      url: '/attendance',
      disabled: true,
      label: 'Coming soon',
      items: [],
      access: { permissions: ['attendance:view:all'] },
    };

    const items = filterNavItems([comingSoonItem], makeUser([]));

    expect(items).toEqual([comingSoonItem]);
    expect(canAccessNavItem(comingSoonItem, makeUser([]))).toBe(false);
  });
});
