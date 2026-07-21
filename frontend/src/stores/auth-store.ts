/**
 * Auth store with refresh mutex + retry.
 * Token kept in-memory (tokenStore), NOT persisted (XSS).
 * Refresh token = httpOnly cookie set by BE.
 */

import { create } from 'zustand';
import { toast } from 'sonner';
import { ApiError, ApiErrorCode } from '@/lib/api-error';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import { isServiceUnavailableError, isUnauthenticatedError } from '@/lib/error-taxonomy';
import { feedbackCopy } from '@/lib/feedback-copy';
import { appLogger } from '@/lib/logger';
import { tokenStore } from '@/lib/token-store';
import { setRefreshHandler } from '@/lib/fetcher';
import {
  authControllerLogin,
  authControllerRefresh,
  authControllerSsoGoogle,
  usersControllerGetMe
} from '@/api/generated/endpoints';
import type { UserMeResponseDto, AccessTokenDto } from '@/api/generated/model';
import { setSentryUser } from '@/lib/observability/init';
import { unwrapData } from '@/lib/api-extract';

type User = UserMeResponseDto;

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  refreshPromise: Promise<string | null> | null;

  signIn: (username: string, password: string) => Promise<User | null>;
  signInWithGoogle: (idToken: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  fetchMe: () => Promise<void>;
  refresh: () => Promise<string | null>;
  bootstrapSession: () => Promise<User | null>;
  hydrateFromServer: (user: User) => void;
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

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleProactiveRefresh(
  expiresInSec: number,
  refreshFn: () => Promise<unknown>,
) {
  clearProactiveRefresh();
  const delayMs = Math.max(expiresInSec * 0.8, 10) * 1000;
  refreshTimer = setTimeout(() => {
    void refreshFn();
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
  tokenStore.set(token);
  if (typeof expiresInSec === 'number' && Number.isFinite(expiresInSec) && expiresInSec > 0) {
    scheduleProactiveRefresh(expiresInSec, () => useAuthStore.getState().refresh());
  }
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

  setInitialized: (val) => set({ initialized: val }),

  hydrateFromServer: (user) => {
    set({ user, initialized: true });
    void setSentryUser({ id: user.id, username: user.username });
  },

  clearState: () => {
    appLogger.info('auth_session_cleared', {
      source: 'auth-store'
    });
    clearProactiveRefresh();
    void setSentryUser(null);
    set({ user: null, loading: false, initialized: false });
    tokenStore.clear();
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
      const expiresIn = (payload && 'expires_in' in payload ? (payload as Record<string, unknown>).expires_in : null) as number | null;
      applyAccessToken(accessToken, expiresIn ?? 1800);

      const meRes = await usersControllerGetMe();
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
      const res = await authControllerSsoGoogle({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (res.status !== 200) {
        toast.error(feedbackCopy.auth.signInFailed);
        return null;
      }
      const payload = unwrapData<AccessTokenDto>(res);
      const accessToken = payload?.access_token ?? null;
      const expiresIn = (payload && 'expires_in' in payload ? (payload as Record<string, unknown>).expires_in : null) as number | null;
      applyAccessToken(accessToken, expiresIn ?? 1800);

      const meRes = await usersControllerGetMe();
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
      await fetch('/api/auth/logout', { method: 'POST' });
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
      appLogger.debug('auth_refresh_join_existing', {
        source: 'auth-store'
      });
      return existing;
    }

    appLogger.info('auth_refresh_started', {
      source: 'auth-store'
    });

    const promise = (async () => {
      try {
        // refreshToken omitted — BE resolves it from httpOnly cookie
        // No loading:true here — refresh runs silently in background
        const res = await withNetworkRetry(() => authControllerRefresh({}));
        const token = res.status === 200 ? unwrapData<{ access_token: string } | null>(res)?.access_token ?? null : null;
        const refreshPayload = res.status === 200 ? res.data?.data : null;
        const expiresIn = (refreshPayload && 'expires_in' in refreshPayload ? (refreshPayload as Record<string, unknown>).expires_in : null) as number | null;
        applyAccessToken(token, expiresIn ?? 1800);
        appLogger.info('auth_refresh_succeeded', {
          source: 'auth-store',
          hasAccessToken: Boolean(token)
        });
        return token;
      } catch (err) {
        if (isUnauthenticatedError(err)) {
          appLogger.warn('auth_refresh_failed', {
            source: 'auth-store',
            reason: 'unauthorized',
            errorCode: err instanceof ApiError ? err.code : undefined,
            requestId: err instanceof ApiError ? err.requestId ?? null : null
          });
          get().clearState();
          return null;
        }
        appLogger.error('auth_refresh_failed', {
          source: 'auth-store',
          reason: err instanceof Error ? err.message : 'unknown_error'
        });
        throw err;
      } finally {
        set({ refreshPromise: null });
      }
    })();

    set({ refreshPromise: promise });
    return promise;
  },

  bootstrapSession: async () => {
    if (typeof window !== 'undefined' && (window as any).__BONEYARD_BUILD) {
      return get().user ?? null;
    }
    if (get().initialized && get().user) {
      return get().user;
    }

    try {
      set({ loading: true });
      try {
        const res = await usersControllerGetMe();
        const user = res.status === 200 ? unwrapData<User | null>(res) : null;
        set({ user, initialized: true, loading: false });
        void setSentryUser(user ? { id: user.id, username: user.username } : null);
        return user;
      } catch (err) {
        if (!isUnauthenticatedError(err)) {
          throw err;
        }
      }

      const token = await get().refresh();
      if (!token) {
        void setSentryUser(null);
        set({ user: null, initialized: true, loading: false });
        return null;
      }

      const res = await usersControllerGetMe();
      const user = res.status === 200 ? unwrapData<User | null>(res) : null;
      set({ user, initialized: true, loading: false });
      void setSentryUser(user ? { id: user.id, username: user.username } : null);
      return user;
    } catch (err) {
      tokenStore.clear();
      void setSentryUser(null);
      set({ user: null, initialized: true, loading: false });
      // Network errors during bootstrap should NOT crash the app — treat as logged out
      if (isUnauthenticatedError(err) || isServiceUnavailableError(err)) {
        return null;
      }
      throw err;
    }
  }
  };
});

if (typeof window !== 'undefined') {
  tokenStore.subscribe((token) => {
    const state = useAuthStore.getState();
    if (token === null) {
      // If we are already on the sign-in page, no need to redirect
      if (!window.location.pathname.startsWith('/auth/sign-in')) {
        window.location.assign('/auth/sign-in');
      }
      // If state is not cleared yet (e.g. broadcast from another tab), clear it now
      if (state.user !== null) {
        state.clearState();
      }
    }
  });
}
console.log('BONEYARD_CHECK_ACTIVE');
