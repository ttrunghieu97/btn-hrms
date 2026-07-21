import { ApiError } from './api-error';
import { getBackendErrorContract } from './error-contract-registry';
import { resolveAppError } from './error-taxonomy';
import { apiErrorCopy, apiErrorFieldCopy } from './feedback-copy';

function humanizeField(field: unknown): string | null {
  if (typeof field !== 'string' || !field.trim()) return null;
  return (
    apiErrorFieldCopy[field] ??
    field
      .split(',')[0]
      .trim()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function inferMessageFromDetails(error: ApiError): string | null {
  const field = humanizeField(error.details?.field);
  const backendCode = error.backendCode ?? '';

  if (!field) return null;

  if (backendCode === 'VALIDATION_ERROR') return apiErrorCopy.invalidField(field);
  if (backendCode === 'INVALID_REQUEST') return apiErrorCopy.invalidField(field);
  if (backendCode === 'CONFLICT') return apiErrorCopy.alreadyExists(field);
  return null;
}

export function getVietnameseApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string') return error;

  if (error instanceof ApiError) {
    const contract = getBackendErrorContract(error.backendCode);
    if (contract) {
      return contract.message;
    }

    const inferred = inferMessageFromDetails(error);
    if (inferred) return inferred;
  }

  if (error instanceof Error) {
    const resolved = resolveAppError(error);
    if (resolved.kind !== 'generic' || resolved.source === 'backend-contract') {
      return resolved.message;
    }

    return fallback;
  }

  return fallback;
}
