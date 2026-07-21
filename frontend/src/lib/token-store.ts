/**
 * In-memory access token store.
 * Refresh token lives in httpOnly cookie (BE-managed).
 * NEVER persist access token to localStorage (XSS).
 *
 * Cross-tab coordination via BroadcastChannel:
 * - When this tab refreshes, broadcast the new token to other tabs.
 * - When another tab refreshes, receive the token without a duplicate request.
 * - When any tab logs out, all tabs clear state.
 */

let accessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

type AuthBroadcast =
  | { type: 'token_update'; token: string }
  | { type: 'logout' };

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('hrms_auth')
    : null;

let isBroadcasting = false;

channel?.addEventListener('message', (event: MessageEvent<AuthBroadcast>) => {
  const msg = event.data;
  if (!msg?.type) return;

  isBroadcasting = true;
  try {
    if (msg.type === 'token_update') {
      accessToken = msg.token;
      listeners.forEach((l) => l(msg.token));
    } else if (msg.type === 'logout') {
      accessToken = null;
      listeners.forEach((l) => l(null));
    }
  } finally {
    isBroadcasting = false;
  }
});

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },
  set(token: string | null): void {
    accessToken = token;
    listeners.forEach((l) => l(token));
    if (!isBroadcasting && token) {
      channel?.postMessage({ type: 'token_update', token } satisfies AuthBroadcast);
    }
  },
  clear(): void {
    accessToken = null;
    listeners.forEach((l) => l(null));
    if (!isBroadcasting) {
      channel?.postMessage({ type: 'logout' } satisfies AuthBroadcast);
    }
  },
  subscribe(fn: (token: string | null) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
