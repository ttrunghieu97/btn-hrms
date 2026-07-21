import { getBackendErrorContractMessage } from '@/locales/vi/error-contracts';
import { generatedBackendErrorContracts } from './generated/backend-error-contracts.generated';

export type ErrorContractKind =
  | 'service-unavailable'
  | 'unauthenticated'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'not-found'
  | 'rate-limit'
  | 'generic';

export type ErrorContractAction =
  | 'retry'
  | 'sign-in'
  | 'review'
  | 'reload'
  | 'contact-admin'
  | 'reselect-file';

export type ErrorContractDomain =
  | 'auth'
  | 'request'
  | 'user'
  | 'employee'
  | 'department'
  | 'position'
  | 'upload'
  | 'schedule'
  | 'attendance'
  | 'system'
  | 'location'
  | 'payroll'
  | 'task'
  | 'notification'
  | 'onboarding'
  | 'offboarding'
  | 'approval'
  | 'role'
  | 'integration'
  | 'document'
  | 'leave'
  | 'workflow'
  | 'chat'
  | 'contract'
  | 'recruitment'
  | 'asset';

export type ErrorContractApiCode =
  | 'AUTH_EXPIRED'
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'SERVER'
  | 'UNKNOWN';

export interface BackendErrorContract {
  backendCode: string;
  httpStatus: number;
  domain: ErrorContractDomain;
  apiCode: ErrorContractApiCode;
  kind: ErrorContractKind;
  retryable: boolean;
  action: ErrorContractAction;
  message: string;
}

type BackendErrorContractMetadata = Omit<BackendErrorContract, 'message'>;

const backendErrorContracts = generatedBackendErrorContracts as Record<
  string,
  BackendErrorContractMetadata
>;

export function getBackendErrorContract(backendCode?: string | null): BackendErrorContract | undefined {
  if (!backendCode) return undefined;
  const normalized = backendCode.toUpperCase();
  const contract = backendErrorContracts[normalized];

  if (!contract) {
    return undefined;
  }

  return {
    ...contract,
    message: getBackendErrorContractMessage({
      backendCode: contract.backendCode,
      domain: contract.domain,
      kind: contract.kind
    })
  };
}

export function matchesBackendError(error: unknown, backendCode: string): boolean {
  return (
    typeof backendCode === 'string' &&
    error instanceof Error &&
    'backendCode' in error &&
    typeof error.backendCode === 'string' &&
    error.backendCode === backendCode
  );
}
