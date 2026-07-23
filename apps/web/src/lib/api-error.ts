import { getBackendErrorContract } from './error-contract-registry';

/**
 * Typed API error with discriminated code.
 * Replaces legacy ApiError (status + message only).
 */

export const ApiErrorCode = {
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION: 'VALIDATION',
  CONFLICT: 'CONFLICT',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
  NETWORK: 'NETWORK',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN'
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export interface ApiErrorDetails {
  missingPermissions?: string[];
  requiredAnyOfPermissions?: string[];
  fields?: Record<string, string[]>;
  [k: string]: unknown;
}

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly backendCode?: string;
  public readonly status?: number;
  public readonly details?: ApiErrorDetails;
  public readonly requestId?: string;
  public readonly cause?: unknown;
  public toastShown = false;

  constructor(args: {
    message: string;
    code: ApiErrorCode;
    backendCode?: string;
    status?: number;
    details?: ApiErrorDetails;
    requestId?: string;
    cause?: unknown;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.code = args.code;
    this.backendCode = args.backendCode;
    this.status = args.status;
    this.details = args.details;
    this.requestId = args.requestId;
    this.cause = args.cause;
  }

  get retryable(): boolean {
    return this.code === ApiErrorCode.NETWORK || this.code === ApiErrorCode.SERVER;
  }
}

export function statusToCode(status?: number): ApiErrorCode {
  if (status === undefined) return ApiErrorCode.NETWORK;
  if (status === 401) return ApiErrorCode.AUTH_EXPIRED;
  if (status === 403) return ApiErrorCode.FORBIDDEN;
  if (status === 409) return ApiErrorCode.CONFLICT;
  if (status === 404) return ApiErrorCode.NOT_FOUND;
  if (status === 422 || status === 400) return ApiErrorCode.VALIDATION;
  if (status === 429) return ApiErrorCode.RATE_LIMIT;
  if (status >= 500) return ApiErrorCode.SERVER;
  return ApiErrorCode.UNKNOWN;
}

function backendCodeToApiCode(backendCode?: string): ApiErrorCode | undefined {
  const contract = getBackendErrorContract(backendCode);
  if (contract) return contract.apiCode as ApiErrorCode;
  if (backendCode === 'NOT_FOUND' || backendCode?.endsWith('_NOT_FOUND')) return ApiErrorCode.NOT_FOUND;
  if (backendCode?.endsWith('_ALREADY_EXISTS')) return ApiErrorCode.CONFLICT;
  return undefined;
}

export function resolveApiErrorCode(args: {
  status?: number;
  backendCode?: string;
}): ApiErrorCode {
  return backendCodeToApiCode(args.backendCode) ?? statusToCode(args.status);
}
