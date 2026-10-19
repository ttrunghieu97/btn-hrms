import * as React from 'react';
import { render, screen } from '@testing-library/react';
import NotificationsPage from './notifications-page';
import { useAuthStore } from '@/stores/auth-store';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../queries/notification-queries', () => ({
  useNotificationsQuery: () => ({ data: [] }),
  useMarkNotificationReadMutation: () => ({ mutate: jest.fn() }),
  useMarkAllNotificationsReadMutation: () => ({ mutate: jest.fn() }),
}));

jest.mock('./notification-preferences-panel', () => ({
  NotificationPreferencesPanel: () => <div data-testid='preferences-panel'>Preferences</div>,
}));

jest.mock('./notification-templates-panel', () => ({
  NotificationTemplatesPanel: () => <div data-testid='templates-panel'>Templates</div>,
}));

const mockedUseAuthStore = useAuthStore as unknown as jest.Mock;

describe('NotificationsPage — RBAC Tab Gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides the Templates management tab for self-scoped employees', () => {
    mockedUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        user: {
          id: 'u-emp',
          username: 'emp1',
          permissions: ['notifications:view:self'],
        },
      }),
    );

    render(<NotificationsPage />);

    expect(screen.getByRole('tab', { name: /Tùy chọn nhận thông báo/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Mẫu thông báo/i })).not.toBeInTheDocument();
  });

  it('renders the Templates management tab when user has notifications:manage:all', () => {
    mockedUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        user: {
          id: 'u-admin',
          username: 'admin1',
          permissions: ['notifications:view:self', 'notifications:manage:all'],
        },
      }),
    );

    render(<NotificationsPage />);

    expect(screen.getByRole('tab', { name: /Tùy chọn nhận thông báo/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Mẫu thông báo/i })).toBeInTheDocument();
  });
});
