import { errorMessageCopy } from '@/locales/vi/error-messages';
import {
  ApiErrorCode,
  resolveApiErrorCode,
  type ApiErrorCode as ResolvedApiErrorCode
} from './api-error';
import {
  getBackendErrorContract,
  type ErrorContractAction,
  type ErrorContractDomain,
  type ErrorContractKind
} from './error-contract-registry';

export type AppErrorKind = ErrorContractKind;

export interface AppErrorClassification {
  kind: AppErrorKind;
  retryable: boolean;
}

export interface AppErrorSemantics {
  source: 'backend-contract' | 'derived';
  domain: ErrorContractDomain;
  kind: AppErrorKind;
  apiCode: ResolvedApiErrorCode;
  retryable: boolean;
  action: ErrorContractAction;
  message: string;
  backendCode?: string;
  status?: number;
  referenceId?: string;
}

export interface AppErrorObservabilityContext {
  errorSource: AppErrorSemantics['source'];
  errorDomain: ErrorContractDomain;
  errorKind: AppErrorKind;
  errorApiCode: ResolvedApiErrorCode;
  errorAction: ErrorContractAction;
  errorRetryable: boolean;
  errorBackendCode?: string;
  errorStatus?: number;
  errorReferenceId?: string;
}

type ErrorLike = Error & {
  code?: string;
  backendCode?: string;
  status?: number;
  digest?: string;
  requestId?: string;
};

const networkMessagePatterns = [
  'fetch failed',
  'network error',
  'service unavailable',
  'timed out',
  'timeout',
  'econnrefused',
  'econnreset',
  'socket hang up'
];

const unauthenticatedMessagePatterns = ['unauthorized', 'auth expired', 'login required'];
const forbiddenMessagePatterns = ['forbidden', 'permission denied', 'not allowed'];
const notFoundMessagePatterns = ['not found'];
const apiErrorCodeValues = new Set<ResolvedApiErrorCode>(Object.values(ApiErrorCode));

const fallbackSemanticsByKind: Record<
  AppErrorKind,
  Omit<
    AppErrorSemantics,
    'source' | 'backendCode' | 'status' | 'referenceId'
  >
> = {
  'service-unavailable': {
    domain: 'system',
    kind: 'service-unavailable',
    apiCode: ApiErrorCode.SERVER,
    retryable: true,
    action: 'retry',
    message: errorMessageCopy.serviceUnavailable
  },
  unauthenticated: {
    domain: 'auth',
    kind: 'unauthenticated',
    apiCode: ApiErrorCode.AUTH_REQUIRED,
    retryable: false,
    action: 'sign-in',
    message: errorMessageCopy.unauthenticated
  },
  forbidden: {
    domain: 'auth',
    kind: 'forbidden',
    apiCode: ApiErrorCode.FORBIDDEN,
    retryable: false,
    action: 'contact-admin',
    message: errorMessageCopy.forbidden
  },
  validation: {
    domain: 'request',
    kind: 'validation',
    apiCode: ApiErrorCode.VALIDATION,
    retryable: false,
    action: 'review',
    message: errorMessageCopy.validation
  },
  conflict: {
    domain: 'request',
    kind: 'conflict',
    apiCode: ApiErrorCode.CONFLICT,
    retryable: false,
    action: 'reload',
    message: errorMessageCopy.conflict
  },
  'not-found': {
    domain: 'request',
    kind: 'not-found',
    apiCode: ApiErrorCode.NOT_FOUND,
    retryable: false,
    action: 'reload',
    message: errorMessageCopy.notFound
  },
  'rate-limit': {
    domain: 'system',
    kind: 'rate-limit',
    apiCode: ApiErrorCode.RATE_LIMIT,
    retryable: false,
    action: 'retry',
    message: errorMessageCopy.rateLimit
  },
  generic: {
    domain: 'system',
    kind: 'generic',
    apiCode: ApiErrorCode.UNKNOWN,
    retryable: false,
    action: 'retry',
    message: errorMessageCopy.generic
  }
};

const kindByApiCode: Partial<Record<ResolvedApiErrorCode, AppErrorKind>> = {
  [ApiErrorCode.NETWORK]: 'service-unavailable',
  [ApiErrorCode.SERVER]: 'service-unavailable',
  [ApiErrorCode.AUTH_EXPIRED]: 'unauthenticated',
  [ApiErrorCode.AUTH_REQUIRED]: 'unauthenticated',
  [ApiErrorCode.FORBIDDEN]: 'forbidden',
  [ApiErrorCode.VALIDATION]: 'validation',
  [ApiErrorCode.CONFLICT]: 'conflict',
  [ApiErrorCode.NOT_FOUND]: 'not-found',
  [ApiErrorCode.RATE_LIMIT]: 'rate-limit'
};

function includesAny(message: string, patterns: string[]): boolean {
  return patterns.some((pattern) => message.includes(pattern));
}

function getErrorParts(error: unknown) {
  const resolved = error instanceof Error ? (error as ErrorLike) : null;

  return {
    message: resolved?.message?.toLowerCase() ?? '',
    code: resolved?.code?.toUpperCase(),
    backendCode: resolved?.backendCode?.toUpperCase(),
    status: resolved?.status,
    referenceId:
      typeof resolved?.requestId === 'string' && resolved.requestId.trim()
        ? resolved.requestId
        : typeof resolved?.digest === 'string' && resolved.digest.trim()
          ? resolved.digest
          : undefined
  };
}

function isApiErrorCode(code?: string): code is ResolvedApiErrorCode {
  return Boolean(code) && apiErrorCodeValues.has(code as ResolvedApiErrorCode);
}

function resolvePrimaryApiCode(args: {
  code?: string;
  status?: number;
  backendCode?: string;
}): ResolvedApiErrorCode {
  if (isApiErrorCode(args.code)) {
    return args.code;
  }

  if (args.backendCode || typeof args.status === 'number') {
    return resolveApiErrorCode({
      status: args.status,
      backendCode: args.backendCode
    });
  }

  return ApiErrorCode.UNKNOWN;
}

function buildDerivedSemantics(
  kind: AppErrorKind,
  args: {
    apiCode?: ResolvedApiErrorCode;
    backendCode?: string;
    status?: number;
    referenceId?: string;
  }
): AppErrorSemantics {
  const base = fallbackSemanticsByKind[kind];

  return {
    ...base,
    source: 'derived',
    apiCode: args.apiCode ?? base.apiCode,
    backendCode: args.backendCode,
    status: args.status,
    referenceId: args.referenceId
  };
}

export function resolveAppError(error: unknown): AppErrorSemantics {
  const { message, code, backendCode, status, referenceId } = getErrorParts(error);
  const contract = getBackendErrorContract(backendCode);

  if (contract) {
    return {
      source: 'backend-contract',
      domain: contract.domain,
      kind: contract.kind,
      apiCode: contract.apiCode as ResolvedApiErrorCode,
      retryable: contract.retryable,
      action: contract.action,
      message: contract.message,
      backendCode: contract.backendCode,
      status: status ?? contract.httpStatus,
      referenceId
    };
  }

  const apiCode = resolvePrimaryApiCode({ code, status, backendCode });
  const kindFromApiCode = kindByApiCode[apiCode];

  if (kindFromApiCode) {
    return buildDerivedSemantics(kindFromApiCode, {
      apiCode,
      backendCode,
      status,
      referenceId
    });
  }

  if (includesAny(message, networkMessagePatterns)) {
    return buildDerivedSemantics('service-unavailable', {
      apiCode: ApiErrorCode.NETWORK,
      backendCode,
      status,
      referenceId
    });
  }

  if (includesAny(message, unauthenticatedMessagePatterns)) {
    return buildDerivedSemantics('unauthenticated', {
      apiCode: ApiErrorCode.AUTH_REQUIRED,
      backendCode,
      status,
      referenceId
    });
  }

  if (includesAny(message, forbiddenMessagePatterns)) {
    return buildDerivedSemantics('forbidden', {
      apiCode: ApiErrorCode.FORBIDDEN,
      backendCode,
      status,
      referenceId
    });
  }

  if (includesAny(message, notFoundMessagePatterns)) {
    return buildDerivedSemantics('not-found', {
      apiCode: ApiErrorCode.NOT_FOUND,
      backendCode,
      status,
      referenceId
    });
  }

  return buildDerivedSemantics('generic', {
    apiCode,
    backendCode,
    status,
    referenceId
  });
}

export function classifyAppError(error: unknown): AppErrorClassification {
  const resolved = resolveAppError(error);

  return {
    kind: resolved.kind,
    retryable: resolved.retryable
  };
}

export function getErrorReferenceId(error: unknown): string | undefined {
  return resolveAppError(error).referenceId;
}

export function getErrorObservabilityContext(error: unknown): AppErrorObservabilityContext {
  const resolved = resolveAppError(error);

  return {
    errorSource: resolved.source,
    errorDomain: resolved.domain,
    errorKind: resolved.kind,
    errorApiCode: resolved.apiCode,
    errorAction: resolved.action,
    errorRetryable: resolved.retryable,
    errorBackendCode: resolved.backendCode,
    errorStatus: resolved.status,
    errorReferenceId: resolved.referenceId
  };
}

export function isUnauthenticatedError(error: unknown): boolean {
  return resolveAppError(error).kind === 'unauthenticated';
}

export function isForbiddenError(error: unknown): boolean {
  return resolveAppError(error).kind === 'forbidden';
}

export function isNotFoundError(error: unknown): boolean {
  return resolveAppError(error).kind === 'not-found';
}

export function isServiceUnavailableError(error: unknown): boolean {
  return resolveAppError(error).kind === 'service-unavailable';
}
