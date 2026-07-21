import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserAuthForm from './user-auth-form';
import { ApiError, ApiErrorCode } from '@/lib/api-error';
import { appCopy } from '@/lib/app-copy';
import { feedbackCopy } from '@/lib/feedback-copy';

const replace = jest.fn();
const signIn = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: any) => unknown) =>
    selector({
      signIn,
      loading: false,
    }),
}));

describe('UserAuthForm', () => {
  beforeEach(() => {
    replace.mockReset();
    signIn.mockReset();
  });

  it('handles invalid credentials without unhandled rejection', async () => {
    signIn.mockRejectedValue(
      new ApiError({
        message: 'Sai tài khoản hoặc mật khẩu!',
        code: ApiErrorCode.AUTH_EXPIRED,
        backendCode: 'AUTH_INVALID_CREDENTIALS',
        status: 401,
      }),
    );

    const onUnhandledRejection = jest.fn();
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    render(<UserAuthForm />);

    fireEvent.change(screen.getByLabelText(appCopy.auth.signIn.form.username), {
      target: { value: 'admin' }
    });
    fireEvent.change(screen.getByLabelText(appCopy.auth.signIn.form.password), {
      target: { value: 'wrong-password' }
    });
    fireEvent.click(screen.getByRole('button', { name: appCopy.auth.signIn.form.submit }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('admin', 'wrong-password');
    });

    await waitFor(() => {
      expect(onUnhandledRejection).not.toHaveBeenCalled();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(feedbackCopy.auth.invalidCredentials);
    expect(replace).not.toHaveBeenCalled();

    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  });
});
