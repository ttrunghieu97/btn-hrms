/**
 * Centralized user-facing error messages.
 *
 * These are human-readable strings returned to API consumers.
 * NEVER embed hardcoded Vietnamese/English strings in business code.
 *
 * Usage:
 *   throwForbidden(ERROR_MESSAGES.FORBIDDEN, ...)
 *   throwForbidden(ERROR_MESSAGES.FORBIDDEN_DOMAIN(domain), ...)
 *
 * When adding i18n later, only this file needs translation.
 */
export const ERROR_MESSAGES = {
  // ── Auth / Authorization ──────────────────────────────────────
  FORBIDDEN: "You do not have permission to perform this action.",
  FORBIDDEN_DOMAIN: (domain: string) =>
    `You do not have permission to view ${domain} records.`,

  // ── Onboarding ─────────────────────────────────────────────────
  ONBOARDING_PROCESS_NOT_FOUND: "Onboarding process not found.",
} as const;

export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];
