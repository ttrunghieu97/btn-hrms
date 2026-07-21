import { errorPresentationCopy } from '@/locales/vi/error-presentation';
import { resolveAppError, type AppErrorSemantics } from './error-taxonomy';

export type ErrorPresentationKind =
  | 'service-unavailable'
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'conflict'
  | 'rate-limit'
  | 'generic';

export interface ErrorPresentation {
  kind: ErrorPresentationKind;
  title: string;
  description: string;
  primaryAction: 'retry' | 'home' | 'sign-in';
  primaryLabel: string;
  referenceId?: string;
}

function normalizeSubject(subject?: string): string {
  return subject?.trim() || errorPresentationCopy.defaultSubject;
}

function resolvePrimaryAction(error: AppErrorSemantics): ErrorPresentation['primaryAction'] {
  if (error.action === 'sign-in') {
    return 'sign-in';
  }

  if (error.kind === 'forbidden' || error.kind === 'not-found') {
    return 'home';
  }

  return 'retry';
}

export function getErrorPresentation(error: unknown, subject?: string): ErrorPresentation {
  const normalizedSubject = normalizeSubject(subject);
  const resolved = resolveAppError(error);
  const { kind, referenceId } = resolved;
  const primaryAction = resolvePrimaryAction(resolved);

  switch (kind) {
    case 'service-unavailable':
      return {
        kind,
        title: errorPresentationCopy.serviceUnavailable.title,
        description: errorPresentationCopy.serviceUnavailable.description(normalizedSubject),
        primaryAction,
        primaryLabel: errorPresentationCopy.serviceUnavailable.primaryLabel,
        referenceId
      };
    case 'unauthenticated':
      return {
        kind,
        title: errorPresentationCopy.unauthenticated.title,
        description: errorPresentationCopy.unauthenticated.description,
        primaryAction,
        primaryLabel: errorPresentationCopy.unauthenticated.primaryLabel,
        referenceId
      };
    case 'forbidden':
      return {
        kind,
        title: errorPresentationCopy.forbidden.title,
        description: errorPresentationCopy.forbidden.description(normalizedSubject),
        primaryAction,
        primaryLabel: errorPresentationCopy.forbidden.primaryLabel,
        referenceId
      };
    case 'not-found':
      return {
        kind,
        title: errorPresentationCopy.notFound.title,
        description: errorPresentationCopy.notFound.description(normalizedSubject),
        primaryAction,
        primaryLabel: errorPresentationCopy.notFound.primaryLabel,
        referenceId
      };
    case 'validation':
      return {
        kind,
        title: errorPresentationCopy.validation.title,
        description: errorPresentationCopy.validation.description(normalizedSubject),
        primaryAction,
        primaryLabel: errorPresentationCopy.validation.primaryLabel,
        referenceId
      };
    case 'conflict':
      return {
        kind,
        title: errorPresentationCopy.conflict.title,
        description: errorPresentationCopy.conflict.description(normalizedSubject),
        primaryAction,
        primaryLabel: errorPresentationCopy.conflict.primaryLabel,
        referenceId
      };
    case 'rate-limit':
      return {
        kind,
        title: errorPresentationCopy.rateLimit.title,
        description: errorPresentationCopy.rateLimit.description,
        primaryAction,
        primaryLabel: errorPresentationCopy.rateLimit.primaryLabel,
        referenceId
      };
    default:
      return {
        kind,
        title: errorPresentationCopy.generic.title,
        description: errorPresentationCopy.generic.description(normalizedSubject),
        primaryAction,
        primaryLabel: errorPresentationCopy.generic.primaryLabel,
        referenceId
      };
  }
}
