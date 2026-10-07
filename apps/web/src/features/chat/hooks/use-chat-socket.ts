'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { envClient } from '@/lib/env.client';
import { tokenStore } from '@/lib/token-store';
import type { Message } from '../utils/types';

const SOCKET_URL = envClient.apiBaseUrl;

type ChatSocketCallbacks = {
  onNewMessage: (message: Message) => void;
  onTyping: (data: {
    userId: string;
    username: string;
    isTyping: boolean;
  }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

export function useChatSocket(callbacks: ChatSocketCallbacks) {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) return;

    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => callbacksRef.current.onConnect?.());
    socket.on('disconnect', () => callbacksRef.current.onDisconnect?.());
    socket.on('new_message', (msg: Message) =>
      callbacksRef.current.onNewMessage(msg)
    );
    socket.on(
      'typing',
      (data: { userId: string; username: string; isTyping: boolean }) =>
        callbacksRef.current.onTyping(data)
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const sendMessage = useCallback(
    (
      conversationId: string,
      content: string,
      attachments?: Array<{
        name: string;
        size: number;
        mimeType: string;
        url: string;
      }>
    ) => {
      socketRef.current?.emit('send_message', {
        conversationId,
        content,
        attachments,
      });
    },
    []
  );

  const sendTyping = useCallback(
    (conversationId: string, isTyping: boolean) => {
      socketRef.current?.emit('typing', { conversationId, isTyping });
    },
    []
  );

  const joinRoom = useCallback((conversationId: string) => {
    socketRef.current?.emit('join_room', conversationId);
  }, []);

  const markRead = useCallback(
    (conversationId: string, messageId: string) => {
      socketRef.current?.emit('mark_read', { conversationId, messageId });
    },
    []
  );

  return { sendMessage, sendTyping, joinRoom, markRead };
}
