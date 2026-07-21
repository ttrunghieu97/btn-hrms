import { ApiError, ApiErrorCode } from './api-error';
import { getVietnameseApiErrorMessage } from './api-error-message';
import { resolveAppError } from './error-taxonomy';

describe('resolveAppError', () => {
  it('prefers backend contracts as semantic source of truth', () => {
    const resolved = resolveAppError(
      new ApiError({
        message: 'Unauthorized',
        code: ApiErrorCode.UNKNOWN,
        backendCode: 'AUTH_INVALID_CREDENTIALS',
        status: 401
      })
    );

    expect(resolved.source).toBe('backend-contract');
    expect(resolved.domain).toBe('auth');
    expect(resolved.kind).toBe('unauthenticated');
    expect(resolved.action).toBe('sign-in');
    expect(resolved.apiCode).toBe(ApiErrorCode.AUTH_EXPIRED);
  });

  it('derives conflict semantics from backend code patterns', () => {
    const resolved = resolveAppError(
      new ApiError({
        message: 'Conflict',
        code: ApiErrorCode.UNKNOWN,
        backendCode: 'ROLE_ALREADY_EXISTS'
      })
    );

    expect(resolved.source).toBe('backend-contract');
    expect(resolved.kind).toBe('conflict');
    expect(resolved.apiCode).toBe(ApiErrorCode.CONFLICT);
    expect(resolved.retryable).toBe(false);
  });

  it('classifies transport failures as service unavailable', () => {
    const resolved = resolveAppError(new Error('fetch failed'));

    expect(resolved.kind).toBe('service-unavailable');
    expect(resolved.apiCode).toBe(ApiErrorCode.NETWORK);
    expect(resolved.retryable).toBe(true);
  });
});

describe('getVietnameseApiErrorMessage', () => {
  it('does not expose raw generic backend messages to users', () => {
    const message = getVietnameseApiErrorMessage(
      new ApiError({
        message: 'Internal stack leaked',
        code: ApiErrorCode.UNKNOWN,
        status: 418
      }),
      'Khong the luu ban ghi'
    );

    expect(message).toBe('Khong the luu ban ghi');
  });
});
