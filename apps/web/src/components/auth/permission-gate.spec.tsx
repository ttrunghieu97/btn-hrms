import { render, screen, waitFor } from '@testing-library/react';
import PermissionGate from './permission-gate';

const replace = jest.fn();
const authState = {
  initialized: true,
  loading: false,
  user: { permissions: ['users:edit'] },
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: any) => unknown) => selector(authState),
}));

describe('PermissionGate', () => {
  beforeEach(() => {
    replace.mockReset();
    authState.initialized = true;
    authState.loading = false;
    authState.user = { permissions: ['users:edit'] };
  });

  it('renders children when permission exists', () => {
    render(
      <PermissionGate permission="users:edit">
        <div>allowed</div>
      </PermissionGate>,
    );

    expect(screen.getByText('allowed')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects when permission missing', async () => {
    authState.user = { permissions: ['users:view'] };

    render(
      <PermissionGate permission="users:edit">
        <div>blocked</div>
      </PermissionGate>,
    );

    expect(screen.queryByText('blocked')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/unauthorized?missing=users%3Aedit');
    });
  });
});
