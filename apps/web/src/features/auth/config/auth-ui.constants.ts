/**
 * Auth UI Design Tokens
 *
 * Centralised CSS class strings for auth page visual consistency.
 * Sync new auth pages to these tokens rather than copying from sign-in.
 *
 * Tokens cover card surface, typography, and button — not layout or
 * business logic (those differ per page intentionally).
 */

export const AUTH_CARD = 'rounded-3xl border border-border/50 bg-card shadow-xl';

export const AUTH_CARD_PADDING = 'p-6 sm:p-8';

export const AUTH_PAGE_TITLE = 'text-2xl font-semibold tracking-tight';

export const AUTH_PAGE_DESCRIPTION = 'text-sm text-muted-foreground';

export const AUTH_BUTTON_HEIGHT = 'h-10';

export const AUTH_ERROR_ALERT =
  'rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-sm font-medium animate-in fade-in';

export const AUTH_DIVIDER_COLOR = 'border-border/60';
