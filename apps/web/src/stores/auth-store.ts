/**
 * Auth store with refresh mutex + retry.
 * Token kept in-memory (tokenStore), NOT persisted (XSS).
 * Refresh token = httpOnly cookie set by BE.
 */

import { create } from "zustand";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-error";
import { getVietnameseApiErrorMessage } from "@/lib/api-error-message";
import {
  isCsrfBlockedError,
  isForbiddenError,
  isRateLimitError,
  isServiceUnavailableError,
  isTerminalRefreshError,
  isUnauthenticatedError,
} from "@/lib/error-taxonomy";
import { feedbackCopy } from "@/lib/feedback-copy";
import { appLogger } from "@/lib/logger";
import { tokenStore } from "@/lib/token-store";
import { setRefreshHandler } from "@/lib/fetcher";
import {
  authControllerLogin,
  authControllerRefresh,
  authControllerSsoGoogle,
} from "@/api/generated/authentication/authentication";
import { usersControllerGetMe } from "@/api/generated/users-management/users-management";
import type { UserMeResponseDto, AccessTokenDto } from "@/api/generated/model";
import { setSentryUser } from "@/lib/observability/init";
import { unwrapData } from "@/lib/api-extract";
import { getQueryClient } from "@/lib/query-client";

export type User = UserMeResponseDto & {
  employeeId?: string | null;
};

export type RefreshCircuitState = "closed" | "open:csrf" | "open:rate-limit";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  refreshPromise: Promise<string | null> | null;
  refreshCircuitState: RefreshCircuitState;
  refreshCooldownUntil: number;
  refreshFailureCount: number;

  signIn: (username: string, password: string) => Promise<User | null>;
  signInWithGoogle: (idToken: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  fetchMe: () => Promise<void>;
  refresh: () => Promise<string | null>;
  recoverSession: () => Promise<string | null>;
  bootstrapSession: () => Promise<User | null>;
  hydrateFromServer: (user: User, expiresInSec?: number) => void;
  clearState: () => void;
  setInitialized: (val: boolean) => void;
}

function isNetworkError(err: unknown): boolean {
  return isServiceUnavailableError(err);
}

async function withNetworkRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isNetworkError(err) || attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

const PROACTIVE_REFRESH_RETRY_SEC = 60;
const DEFAULT_SSR_PROACTIVE_REFRESH_SEC = 1800;
const TAB_RESUME_REFRESH_THRESHOLD_MS = 60_000;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 30_000;
const CSRF_CIRCUIT_BASE_COOLDOWN_MS = 60_000;
const CSRF_CIRCUIT_MAX_COOLDOWN_MS = 5 * 60_000;
const MAX_CSRF_RECOVERY_PROBES = 3;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let accessTokenExpiresAtMs = 0;
let circuitRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
let csrfBlockedError: Error | null = null;
let rateLimitUntilMs = 0;
let rateLimitError: Error | null = null;
let isRedirectingToSignIn = false;
let signInNavigator: (path: string) => void = (path) => {
  window.location.assign(path);
};

function clearCircuitRecoveryTimer() {
  if (circuitRecoveryTimer) {
    clearTimeout(circuitRecoveryTimer);
    circuitRecoveryTimer = null;
  }
}

export function resetAuthStoreRuntimeForTesting(customNavigator?: (path: string) => void) {
  clearProactiveRefresh();
  clearCircuitRecoveryTimer();
  accessTokenExpiresAtMs = 0;
  csrfBlockedError = null;
  rateLimitUntilMs = 0;
  rateLimitError = null;
  isRedirectingToSignIn = false;
  signInNavigator =
    customNavigator ??
    ((path: string) => {
      window.location.assign(path);
    });
}

function redirectToSignInOnce() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/auth/sign-in")) return;
  if (isRedirectingToSignIn) return;
  isRedirectingToSignIn = true;
  signInNavigator("/auth/sign-in");
}

function scheduleProactiveRefresh(expiresInSec: number, refreshFn: () => Promise<unknown>) {
  clearProactiveRefresh();
  accessTokenExpiresAtMs = Date.now() + expiresInSec * 1000;
  const delayMs = Math.max(expiresInSec * 0.8, 10) * 1000;
  refreshTimer = setTimeout(() => {
    void refreshFn().catch((err) => {
      if (useAuthStore.getState().user && !isCsrfBlockedError(err)) {
        const retrySec =
          err instanceof ApiError && typeof err.retryAfterMs === "number" && err.retryAfterMs > 0
            ? Math.ceil(err.retryAfterMs / 1000)
            : PROACTIVE_REFRESH_RETRY_SEC;
        scheduleProactiveRefresh(retrySec, refreshFn);
      }
    });
  }, delayMs);
}

function clearProactiveRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function applyAccessToken(token: string | null, expiresInSec?: number) {
  if (!token) return;
  clearCircuitRecoveryTimer();
  csrfBlockedError = null;
  rateLimitUntilMs = 0;
  rateLimitError = null;
  isRedirectingToSignIn = false;
  useAuthStore.setState({
    refreshCircuitState: "closed",
    refreshCooldownUntil: 0,
    refreshFailureCount: 0,
  });
  tokenStore.set(token);
  if (typeof expiresInSec === "number" && Number.isFinite(expiresInSec) && expiresInSec > 0) {
    scheduleProactiveRefresh(expiresInSec, () => useAuthStore.getState().refresh());
  }
}

export function useCanRunAuthenticatedQuery(): boolean {
  return useAuthStore(
    (state) => Boolean(state.user?.id) && state.refreshCircuitState === "closed",
  );
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Wire fetcher's 401 handler to this store's refresh mutex immediately on store creation.
  // This ensures a single in-flight refresh across all concurrent API calls.
  setRefreshHandler(() => get().refresh());

  return {
    user: null,
    loading: false,
    initialized: false,
    refreshPromise: null,
    refreshCircuitState: "closed",
    refreshCooldownUntil: 0,
    refreshFailureCount: 0,

    setInitialized: (val) => set({ initialized: val }),

    hydrateFromServer: (user, expiresInSec) => {
      clearCircuitRecoveryTimer();
      csrfBlockedError = null;
      rateLimitUntilMs = 0;
      rateLimitError = null;
      isRedirectingToSignIn = false;
      set({
        user,
        initialized: true,
        refreshCircuitState: "closed",
        refreshCooldownUntil: 0,
        refreshFailureCount: 0,
      });
      const ttlSec =
        typeof expiresInSec === "number" && Number.isFinite(expiresInSec) && expiresInSec > 0
          ? expiresInSec
          : DEFAULT_SSR_PROACTIVE_REFRESH_SEC;
      scheduleProactiveRefresh(ttlSec, () => get().refresh());
      void setSentryUser({ id: user.id, username: user.username });
    },

    clearState: () => {
      appLogger.info("auth_session_cleared", {
        source: "auth-store",
      });
      clearProactiveRefresh();
      clearCircuitRecoveryTimer();
      accessTokenExpiresAtMs = 0;
      csrfBlockedError = null;
      rateLimitUntilMs = 0;
      rateLimitError = null;
      void setSentryUser(null);
      set({
        user: null,
        loading: false,
        initialized: false,
        refreshCircuitState: "closed",
        refreshCooldownUntil: 0,
        refreshFailureCount: 0,
      });
      tokenStore.clear();
      try {
        getQueryClient().clear();
      } catch {
        // Ignore if QueryClient is not initialized in test context
      }
      redirectToSignInOnce();
    },

    signIn: async (username, password) => {
      set({ loading: true });
      try {
        const res = await authControllerLogin({ username, password });
        if (res.status !== 200) {
          toast.error(feedbackCopy.auth.invalidCredentials);
          return null;
        }
        const payload = unwrapData<AccessTokenDto>(res);
        const accessToken = payload?.access_token ?? null;
        const expiresIn = (
          payload && "expires_in" in payload
            ? (payload as Record<string, unknown>).expires_in
            : null
        ) as number | null;
        applyAccessToken(accessToken, expiresIn ?? 1800);

        const [meRes] = await Promise.all([
          usersControllerGetMe(),
          fetch("/api/auth/permission-session", { method: "POST" }).catch(() => undefined),
        ]);
        const user = meRes.status === 200 ? unwrapData<User | null>(meRes) : null;
        set({ user, initialized: true });
        void setSentryUser(user ? { id: user.id, username: user.username } : null);
        toast.success(feedbackCopy.auth.signInSuccess);
        return user;
      } catch (err) {
        toast.error(getVietnameseApiErrorMessage(err, feedbackCopy.auth.signInFailed));
        throw err;
      } finally {
        set({ loading: false });
      }
    },

    signInWithGoogle: async (idToken: string) => {
      set({ loading: true });
      try {
        const res = await authControllerSsoGoogle({ idToken });
        if (res.status !== 200) {
          toast.error(feedbackCopy.auth.signInFailed);
          return null;
        }
        const payload = unwrapData<AccessTokenDto>(res);
        const accessToken = payload?.access_token ?? null;
        const expiresIn = (
          payload && "expires_in" in payload
            ? (payload as Record<string, unknown>).expires_in
            : null
        ) as number | null;
        applyAccessToken(accessToken, expiresIn ?? 1800);

        const [meRes] = await Promise.all([
          usersControllerGetMe(),
          fetch("/api/auth/permission-session", { method: "POST" }).catch(() => undefined),
        ]);
        const user = meRes.status === 200 ? unwrapData<User | null>(meRes) : null;
        set({ user, initialized: true });
        void setSentryUser(user ? { id: user.id, username: user.username } : null);
        toast.success(feedbackCopy.auth.signInSuccess);
        return user;
      } catch (err) {
        toast.error(getVietnameseApiErrorMessage(err, feedbackCopy.auth.signInFailed));
        throw err;
      } finally {
        set({ loading: false });
      }
    },

    signOut: async () => {
      try {
        await Promise.all([
          fetch("/api/auth/logout", { method: "POST" }),
          fetch("/api/auth/permission-session", { method: "DELETE" }),
        ]);
      } catch {
        // ignore - clear local regardless
      } finally {
        get().clearState();
        toast.success(feedbackCopy.auth.signOutSuccess);
      }
    },

    fetchMe: async () => {
      set({ loading: true });
      try {
        const res = await usersControllerGetMe();
        const user = res.status === 200 ? unwrapData<User | null>(res) : null;
        set({ user, initialized: true });
        void setSentryUser(user ? { id: user.id, username: user.username } : null);
      } catch {
        set({ initialized: true });
      } finally {
        set({ loading: false });
      }
    },

    refresh: async () => {
      const existing = get().refreshPromise;
      if (existing) {
        appLogger.debug("auth_refresh_join_existing", {
          source: "auth-store",
        });
        return existing;
      }

      const now = Date.now();
      const { refreshCircuitState, refreshCooldownUntil, refreshFailureCount } = get();

      if (refreshCircuitState === "open:csrf" && csrfBlockedError) {
        const cooldownActive = refreshCooldownUntil > now;
        const probesExhausted = refreshFailureCount >= MAX_CSRF_RECOVERY_PROBES;
        if (cooldownActive || probesExhausted) {
          throw csrfBlockedError;
        }
        // Cooldown elapsed and probe budget remains -> half-open single-flight probe
      }

      if (refreshCircuitState === "open:rate-limit" && rateLimitError) {
        if (rateLimitUntilMs > now) {
          throw rateLimitError;
        }
        rateLimitUntilMs = 0;
        rateLimitError = null;
        set({ refreshCircuitState: "closed", refreshCooldownUntil: 0 });
      }

      appLogger.info("auth_refresh_started", {
        source: "auth-store",
      });

      const promise = (async () => {
        try {
          // refreshToken omitted — BE resolves it from httpOnly cookie
          // No loading:true here — refresh runs silently in background
          const res = await withNetworkRetry(() => authControllerRefresh({}));
          const token =
            res.status === 200
              ? (unwrapData<{ access_token: string } | null>(res)?.access_token ?? null)
              : null;
          const refreshPayload = res.status === 200 ? res.data?.data : null;
          const expiresIn = (
            refreshPayload && "expires_in" in refreshPayload
              ? (refreshPayload as Record<string, unknown>).expires_in
              : null
          ) as number | null;
          applyAccessToken(token, expiresIn ?? 1800);
          appLogger.info("auth_refresh_succeeded", {
            source: "auth-store",
            hasAccessToken: Boolean(token),
          });
          return token;
        } catch (err) {
          const errorMeta = {
            source: "auth-store",
            reason: err instanceof Error ? err.message : "unknown_error",
            errorCode: err instanceof ApiError ? err.code : undefined,
            backendCode: err instanceof ApiError ? err.backendCode : undefined,
            errorReason: err instanceof ApiError ? err.details?.reason : undefined,
            status: err instanceof ApiError ? err.status : undefined,
            requestId: err instanceof ApiError ? (err.requestId ?? null) : null,
          };
          if (isTerminalRefreshError(err)) {
            appLogger.warn("auth_refresh_failed", {
              ...errorMeta,
              reason: "unauthorized",
            });
            get().clearState();
            return null;
          }
          if (isCsrfBlockedError(err)) {
            const nextCount = get().refreshFailureCount + 1;
            const cooldownMs = Math.min(
              CSRF_CIRCUIT_BASE_COOLDOWN_MS * 2 ** (nextCount - 1),
              CSRF_CIRCUIT_MAX_COOLDOWN_MS,
            );
            csrfBlockedError = err instanceof Error ? err : new Error(String(err));
            clearProactiveRefresh();
            set({
              refreshCircuitState: "open:csrf",
              refreshCooldownUntil: Date.now() + cooldownMs,
              refreshFailureCount: nextCount,
            });
            if (nextCount === 1) {
              appLogger.warn("auth_refresh_failed", {
                ...errorMeta,
                reason: "csrf_blocked",
              });
            }
            throw csrfBlockedError;
          }
          if (isForbiddenError(err)) {
            appLogger.warn("auth_refresh_failed", {
              ...errorMeta,
              reason: "forbidden",
            });
            throw err;
          }
          if (isRateLimitError(err)) {
            const cooldownMs =
              err instanceof ApiError &&
              typeof err.retryAfterMs === "number" &&
              err.retryAfterMs > 0
                ? err.retryAfterMs
                : DEFAULT_RATE_LIMIT_COOLDOWN_MS;
            const until = Date.now() + cooldownMs;
            rateLimitUntilMs = until;
            rateLimitError = err instanceof Error ? err : new Error(String(err));
            set({
              refreshCircuitState: "open:rate-limit",
              refreshCooldownUntil: until,
            });
            clearCircuitRecoveryTimer();
            circuitRecoveryTimer = setTimeout(() => {
              circuitRecoveryTimer = null;
              if (useAuthStore.getState().refreshCircuitState === "open:rate-limit") {
                rateLimitUntilMs = 0;
                rateLimitError = null;
                useAuthStore.setState({
                  refreshCircuitState: "closed",
                  refreshCooldownUntil: 0,
                });
              }
            }, cooldownMs);
            appLogger.warn("auth_refresh_failed", {
              ...errorMeta,
              reason: "rate_limited",
              retryAfterMs: cooldownMs,
            });
            throw rateLimitError;
          }
          if (isServiceUnavailableError(err)) {
            appLogger.warn("auth_refresh_failed", errorMeta);
            throw err;
          }
          if (isUnauthenticatedError(err)) {
            appLogger.warn("auth_refresh_failed", {
              ...errorMeta,
              reason: "unauthenticated_non_terminal",
            });
            throw err;
          }
          appLogger.error("auth_refresh_failed", errorMeta);
          throw err;
        } finally {
          set({ refreshPromise: null });
        }
      })();

      set({ refreshPromise: promise });
      return promise;
    },

    recoverSession: async () => {
      clearCircuitRecoveryTimer();
      csrfBlockedError = null;
      rateLimitUntilMs = 0;
      rateLimitError = null;
      set({
        refreshCooldownUntil: 0,
        refreshFailureCount: 0,
      });
      return get().refresh();
    },

    bootstrapSession: async () => {
      if (get().initialized && get().user) {
        return get().user;
      }

      try {
        set({ loading: true });
        // customFetch automatically handles 401 via the wired refresh mutex and retries once
        const res = await usersControllerGetMe();
        const user = res.status === 200 ? unwrapData<User | null>(res) : null;
        set({ user, initialized: true, loading: false });
        void setSentryUser(user ? { id: user.id, username: user.username } : null);
        return user;
      } catch (err) {
        if (isTerminalRefreshError(err) && tokenStore.get() === null) {
          get().clearState();
          set({ initialized: true, loading: false });
          return null;
        }
        // Network errors during bootstrap should NOT crash the app or broadcast logout
        if (isServiceUnavailableError(err)) {
          set({ initialized: true, loading: false });
          return null;
        }
        set({ loading: false });
        throw err;
      }
    },
  };
});

if (typeof window !== "undefined") {
  tokenStore.subscribe((token) => {
    const state = useAuthStore.getState();
    if (token !== null) {
      clearCircuitRecoveryTimer();
      isRedirectingToSignIn = false;
      csrfBlockedError = null;
      rateLimitUntilMs = 0;
      rateLimitError = null;
      if (state.refreshCircuitState !== "closed") {
        useAuthStore.setState({
          refreshCircuitState: "closed",
          refreshCooldownUntil: 0,
          refreshFailureCount: 0,
        });
      }
      return;
    }
    if (state.user !== null || state.initialized) {
      state.clearState();
    }
  });

  const maybeRefreshOnTabResume = () => {
    if (document.visibilityState === "hidden") return;
    const state = useAuthStore.getState();
    if (!state.user || state.refreshPromise || state.refreshCircuitState !== "closed") {
      return;
    }
    if (
      accessTokenExpiresAtMs > 0 &&
      Date.now() >= accessTokenExpiresAtMs - TAB_RESUME_REFRESH_THRESHOLD_MS
    ) {
      void state.refresh().catch(() => undefined);
    }
  };

  window.addEventListener("focus", maybeRefreshOnTabResume);
  document.addEventListener("visibilitychange", maybeRefreshOnTabResume);
}
