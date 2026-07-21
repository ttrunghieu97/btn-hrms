/**
 * use-task-live-updates.ts
 * SSE subscription to /tasks/events/stream that invalidates React Query
 * caches in real time.
 *
 * Differences from legacy:
 *   - Token comes from `tokenStore` (in-memory), not localStorage. The
 *     legacy code read `localStorage.getItem('access_token')`, which no
 *     longer exists in the new auth model (XSS-safer).
 *   - Pauses (closes) the EventSource when document.visibilityState is
 *     'hidden' to stop background traffic, then reconnects on visible.
 *   - Uses NEXT_PUBLIC_API_URL via the same convention as fetcher.ts.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { envClient } from '@/lib/env.client';
import { tokenStore } from '@/lib/token-store';
import { taskKeys } from '../queries/task-queries';

const API_BASE_URL = envClient.apiBaseUrl.replace(/\/+$/, '');
const SSE_PATH = '/tasks/events/stream';
const MAX_RETRY_DELAY_MS = 30_000;
const BASE_RETRY_DELAY_MS = 1_000;

type TaskEventAction =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_accepted'
  | 'task_declined'
  | 'task_submitted'
  | 'task_approved'
  | 'task_returned'
  | 'task_resubmitted';

interface TaskSsePayload {
  type: 'task_event';
  action: TaskEventAction;
  taskId: string;
  task?: { id?: string; [key: string]: unknown };
  occurredAt: string;
}

type TaskListCache =
  | Array<{ id?: string }>
  | { tasks?: Array<{ id?: string }> }
  | null
  | undefined;

function patchTaskInCache(
  old: TaskListCache,
  taskId: string,
  next: { id?: string }
): TaskListCache {
  if (!old) return old;
  if (Array.isArray(old)) {
    return old.map((t) => (t?.id === taskId ? next : t));
  }
  if (typeof old === 'object' && 'tasks' in old) {
    const tasks = old.tasks ?? [];
    return { ...old, tasks: tasks.map((t) => (t?.id === taskId ? next : t)) };
  }
  return old;
}

export function useTaskLiveUpdates(): void {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const lastEventIdRef = useRef<string | undefined>(undefined);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEvent = useCallback(
    (payload: TaskSsePayload) => {
      const { action, taskId } = payload;
      switch (action) {
        case 'task_created':
        case 'task_deleted':
          queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
          break;
        case 'task_updated':
        case 'task_accepted':
        case 'task_declined':
        case 'task_submitted':
        case 'task_approved':
        case 'task_returned':
        case 'task_resubmitted': {
          if (payload.task) {
            queryClient.setQueriesData(
              { queryKey: taskKeys.lists() },
              (old: TaskListCache) =>
                patchTaskInCache(old, taskId, payload.task!)
            );
          }
          queryClient.invalidateQueries({
            queryKey: taskKeys.activities(taskId)
          });
          queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
          break;
        }
        default:
          break;
      }
    },
    [queryClient]
  );

  const closeStream = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    closeStream();
    const token = tokenStore.get();
    if (!token) return;
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden'
    ) {
      return;
    }

    let url = `${API_BASE_URL}${SSE_PATH}`;
    if (lastEventIdRef.current) {
      url += `?lastEventId=${encodeURIComponent(lastEventIdRef.current)}`;
    }

    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      retryCountRef.current = 0;
    };
    es.onmessage = (event: MessageEvent) => {
      if (event.lastEventId) lastEventIdRef.current = event.lastEventId;
      try {
        const data = JSON.parse(event.data) as TaskSsePayload;
        if (data.type === 'task_event') handleEvent(data);
      } catch {
        /* ignore malformed messages */
      }
    };
    es.onerror = () => {
      es.close();
      esRef.current = null;
      const delay = Math.min(
        BASE_RETRY_DELAY_MS * 2 ** retryCountRef.current,
        MAX_RETRY_DELAY_MS
      );
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(connect, delay);
    };
  }, [closeStream, handleEvent]);

  // Visibility handling — pause on hidden, resume on visible.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        closeStream();
      } else {
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [closeStream, connect]);

  // Token reactivity — reconnect when access token changes.
  useEffect(() => {
    return tokenStore.subscribe(() => connect());
  }, [connect]);

  useEffect(() => {
    connect();
    return () => closeStream();
  }, [connect, closeStream]);
}
