import { getBackendErrorContract } from './error-contract-registry';

describe('getBackendErrorContract', () => {
  it.each([
    [
      'AUTH_REFRESH_INVALID',
      { domain: 'auth', kind: 'unauthenticated', apiCode: 'AUTH_EXPIRED', action: 'sign-in' }
    ],
    [
      'PAYROLL_NOT_FOUND',
      { domain: 'payroll', kind: 'not-found', apiCode: 'NOT_FOUND', action: 'reload', httpStatus: 404 }
    ],
    [
      'ROLE_ALREADY_EXISTS',
      { domain: 'role', kind: 'conflict', apiCode: 'CONFLICT', action: 'review', httpStatus: 409 }
    ],
    [
      'PERMISSION_DENIED',
      { domain: 'auth', kind: 'forbidden', apiCode: 'FORBIDDEN', action: 'contact-admin', httpStatus: 403 }
    ],
    [
      'IDEMPOTENCY_IN_PROGRESS',
      { domain: 'workflow', kind: 'rate-limit', apiCode: 'RATE_LIMIT', action: 'retry', httpStatus: 409 }
    ],
    [
      'APPROVAL_REQUEST_NOT_PENDING',
      { domain: 'approval', kind: 'conflict', apiCode: 'CONFLICT', action: 'reload', httpStatus: 409 }
    ],
    [
      'TASK_DEPENDENCY_CIRCULAR',
      { domain: 'task', kind: 'validation', apiCode: 'VALIDATION', action: 'review', httpStatus: 400 }
    ],
    [
      'SERVICE_UNAVAILABLE',
      { domain: 'system', kind: 'service-unavailable', apiCode: 'SERVER', action: 'retry', httpStatus: 503 }
    ]
  ])('derives semantic contract for %s', (backendCode, expected) => {
    const contract = getBackendErrorContract(backendCode);

    expect(contract).toMatchObject(expected);
    expect(contract?.message).toBeTruthy();
  });

  it('keeps explicit contracts for specialized upload actions', () => {
    const contract = getBackendErrorContract('FILE_TOKEN_EXPIRED');

    expect(contract).toMatchObject({
      domain: 'upload',
      kind: 'validation',
      apiCode: 'VALIDATION',
      action: 'reselect-file',
      httpStatus: 422
    });
  });
});
