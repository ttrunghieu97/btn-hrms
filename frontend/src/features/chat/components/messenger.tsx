'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '../utils/store';
import { useConversationsQuery, useMessagesQuery, chatKeys } from '../queries/chat-queries';
import { useChatSocket } from '../hooks/use-chat-socket';
import type { Attachment, Conversation, Message, TypingUser } from '../utils/types';
import { ConversationList } from './conversation-list';
import { ConversationSelect } from './conversation-select';
import { ChatArea } from './chat-area';

function deriveDisplayName(conv: Conversation, currentUserId: string): string {
  if (conv.type === 'group') return conv.name ?? 'Group';
  const other = conv.participants.find((p) => p.userId !== currentUserId);
  return other?.username ?? conv.name ?? 'Chat';
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function Messenger() {
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id ?? '';
  const queryClient = useQueryClient();

  const {
    selectedConversationId,
    draft,
    typingUsers,
    selectConversation,
    setDraft,
    setTyping,
    clearStaleTyping
  } = useChatStore();

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const shouldReduceMotion = useReducedMotion();
  const typingTimeoutRef = useRef<number | null>(null);

  const { data: conversations = [] } = useConversationsQuery();
  const { data: messages = [] } = useMessagesQuery(selectedConversationId);

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      selectConversation(conversations[0]!.id);
    }
  }, [conversations, selectedConversationId, selectConversation]);

  // Clear stale typing indicators periodically
  useEffect(() => {
    const interval = window.setInterval(clearStaleTyping, 3000);
    return () => clearInterval(interval);
  }, [clearStaleTyping]);

  // Clear attachments on conversation switch
  useEffect(() => {
    setAttachments([]);
  }, [selectedConversationId]);

  const onNewMessage = useCallback(
    (message: Message) => {
      queryClient.setQueryData(
        chatKeys.messages(message.conversationId),
        (old: Message[] | undefined) => {
          const existing = old ? [...old] : [];
          if (existing.some((m) => m.id === message.id)) return existing;
          return [...existing, message];
        }
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.lists() });
    },
    [queryClient]
  );

  const onTyping = useCallback(
    (data: { userId: string; username: string; isTyping: boolean }) => {
      if (!selectedConversationId) return;
      setTyping(selectedConversationId, data.userId, data.username, data.isTyping);
    },
    [selectedConversationId, setTyping]
  );

  const { sendMessage: socketSendMessage, sendTyping, markRead } = useChatSocket({
    onNewMessage,
    onTyping
  });

  const handleAddAttachments = useCallback((files: FileList) => {
    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: 'file-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      name: file.name,
      size: file.size,
      type: file.type
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleDraftChange = useCallback(
    (text: string) => {
      setDraft(text);
      if (!selectedConversationId) return;

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      if (text.length > 0) {
        sendTyping(selectedConversationId, true);
        typingTimeoutRef.current = window.setTimeout(() => {
          sendTyping(selectedConversationId, false);
        }, 2000);
      } else {
        sendTyping(selectedConversationId, false);
      }
    },
    [selectedConversationId, setDraft, sendTyping]
  );

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if ((!draft.trim() && attachments.length === 0) || !selectedConversationId) return;

      socketSendMessage(selectedConversationId, draft.trim());
      setDraft('');
      setAttachments([]);

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      sendTyping(selectedConversationId, false);
    },
    [draft, attachments, selectedConversationId, socketSendMessage, setDraft, sendTyping]
  );

  const handleSelectConversation = useCallback(
    (id: string) => {
      selectConversation(id);
      const msgs = queryClient.getQueryData<Message[]>(chatKeys.messages(id));
      if (msgs?.length) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg) markRead(id, lastMsg.id);
      }
    },
    [selectConversation, queryClient, markRead]
  );

  // Build display-friendly conversation list
  const displayConversations = conversations.map((conv) => ({
    ...conv,
    displayName: deriveDisplayName(conv, currentUserId),
    initials: getInitials(deriveDisplayName(conv, currentUserId))
  }));

  const activeConv = displayConversations.find(
    (c) => c.id === selectedConversationId
  );

  const activeMessages: Message[] = messages.map((m) => ({
    ...m,
    senderRole: (m.sender?.userId === currentUserId ? 'self' : 'other') as 'self' | 'other'
  }));

  const currentTypingUsers: TypingUser[] = selectedConversationId
    ? (typingUsers[selectedConversationId] ?? []).map((t) => ({
        userId: t.userId,
        username: t.username
      }))
    : [];

  if (!activeConv) {
    return (
      <div className='border-border/50 bg-background/70 flex h-[calc(100dvh-5.5rem)] w-full items-center justify-center rounded-2xl border backdrop-blur-xl lg:rounded-3xl'>
        <p className='text-muted-foreground text-sm'>
          {conversations.length === 0
            ? 'No conversations yet'
            : 'Select a conversation'}
        </p>
      </div>
    );
  }

  return (
    <div className='border-border/50 bg-background/70 relative grid h-[calc(100dvh-5.5rem)] w-full grid-rows-[auto,1fr] gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur-xl sm:gap-4 sm:p-4 lg:[grid-template-columns:30%_1fr] lg:grid-rows-[1fr] lg:gap-4 lg:rounded-3xl lg:p-5'>
      <ConversationSelect
        conversations={displayConversations}
        selectedId={selectedConversationId ?? ''}
        onSelect={handleSelectConversation}
      />
      <ConversationList
        conversations={displayConversations}
        selectedId={selectedConversationId ?? ''}
        onSelect={handleSelectConversation}
      />
      <ChatArea
        conversation={activeConv}
        messages={activeMessages}
        draft={draft}
        onDraftChange={handleDraftChange}
        onSubmit={handleSubmit}
        attachments={attachments}
        onAddAttachments={handleAddAttachments}
        onRemoveAttachment={handleRemoveAttachment}
        typingUsers={currentTypingUsers}
      />
    </div>
  );
}
