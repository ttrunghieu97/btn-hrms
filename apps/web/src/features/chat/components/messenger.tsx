'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '../utils/store';
import {
  useConversationsQuery,
  useMessagesQuery,
  useCreateConversationMutation,
  useChatParticipantsQuery,
  chatKeys,
} from '../queries/chat-queries';
import { useChatSocket } from '../hooks/use-chat-socket';
import type { Attachment, Conversation, Message, TypingUser } from '../utils/types';
import type { CreateConversationDtoType } from '@/api/generated/model';
import { ConversationList } from './conversation-list';
import { ConversationSelect } from './conversation-select';
import { ChatArea } from './chat-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { chatUiCopy, commonUiCopy } from '@/lib/app-copy';
import { unwrapData } from '@/lib/api-extract';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';

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

export function appendMessageToCache(old: unknown, message: Message): unknown {
  const appendUnique = (list: Message[]): Message[] => {
    if (list.some((m) => m.id === message.id)) return list;
    return [...list, message];
  };

  if (!old) {
    return [message];
  }

  if (Array.isArray(old)) {
    return appendUnique(old as Message[]);
  }

  if (typeof old === 'object') {
    const record = old as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return {
        ...record,
        data: appendUnique(record.data as Message[]),
      };
    }
    if (record.data && typeof record.data === 'object') {
      const inner = record.data as Record<string, unknown>;
      if (Array.isArray(inner.data)) {
        return {
          ...record,
          data: {
            ...inner,
            data: appendUnique(inner.data as Message[]),
          },
        };
      }
      if (Array.isArray(inner.items)) {
        return {
          ...record,
          data: {
            ...inner,
            items: appendUnique(inner.items as Message[]),
          },
        };
      }
    }
  }

  return [message];
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
  const [createOpen, setCreateOpen] = useState(false);
  const [convType, setConvType] = useState<CreateConversationDtoType>('direct');
  const [convName, setConvName] = useState('');
  const [participantId, setParticipantId] = useState('');
  const typingTimeoutRef = useRef<number | null>(null);
  const lastMarkedReadRef = useRef<string | null>(null);

  const { data: conversations = [] } = useConversationsQuery();
  const { data: messages = [] } = useMessagesQuery(selectedConversationId);
  const createConversation = useCreateConversationMutation();
  const { data: participants = [] } = useChatParticipantsQuery(createOpen);

  const participantOptions = useMemo(
    () =>
      participants.map((emp) => {
        const fullName = [emp.lastName, emp.firstName].filter(Boolean).join(' ');
        const userId = emp.userId ?? emp.id;
        return {
          value: userId,
          label: emp.employeeCode ? `${fullName} (${emp.employeeCode})` : fullName,
        };
      }),
    [participants],
  );

  const handleCreateConversation = async () => {
    const ids = participantId
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return;
    try {
      const res = await createConversation.mutateAsync({
        type: convType,
        ...(convName.trim() ? { name: convName.trim() } : {}),
        participantUserIds: ids,
      });
      const created = unwrapData<{ id?: string }>(res);
      if (created?.id) {
        selectConversation(created.id);
      }
      notifyMutationSuccess('Đã tạo cuộc trò chuyện mới');
      setCreateOpen(false);
      setConvName('');
      setParticipantId('');
    } catch (err) {
      notifyMutationError(err, 'Không thể tạo cuộc trò chuyện');
    }
  };

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
        (old: unknown) => appendMessageToCache(old, message)
      );
      void queryClient.invalidateQueries({ queryKey: chatKeys.lists() });
    },
    [queryClient]
  );

  const onTyping = useCallback(
    (data: {
      conversationId?: string;
      userId: string;
      username: string;
      isTyping: boolean;
    }) => {
      const targetConvId = data.conversationId ?? selectedConversationId;
      if (!targetConvId) return;
      if (data.conversationId && selectedConversationId && data.conversationId !== selectedConversationId) {
        return;
      }
      setTyping(targetConvId, data.userId, data.username, data.isTyping);
    },
    [selectedConversationId, setTyping]
  );

  const { sendMessage: socketSendMessage, sendTyping, joinRoom, markRead } = useChatSocket({
    onNewMessage,
    onTyping
  });

  // Join active conversation socket room
  useEffect(() => {
    if (!selectedConversationId) return;
    joinRoom(selectedConversationId);
  }, [selectedConversationId, joinRoom]);

  // Mark latest message in active conversation as read once per message
  useEffect(() => {
    if (!selectedConversationId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;
    const readKey = `${selectedConversationId}:${lastMsg.id}`;
    if (lastMarkedReadRef.current === readKey) return;
    lastMarkedReadRef.current = readKey;
    markRead(selectedConversationId, lastMsg.id);
  }, [selectedConversationId, messages, markRead]);

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

      const outgoingAttachments =
        attachments.length > 0
          ? attachments.map((att) => ({
              name: att.name,
              size: att.size,
              mimeType: att.mimeType ?? att.type,
              url: att.url ?? '',
            }))
          : undefined;

      socketSendMessage(selectedConversationId, draft.trim(), outgoingAttachments);
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
    },
    [selectConversation]
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

  const createDialog = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Tạo cuộc trò chuyện mới</DialogTitle>
        </DialogHeader>
        <div className='space-y-4 py-2'>
          <div className='space-y-1.5'>
            <Label>Loại cuộc trò chuyện</Label>
            <Select
              value={convType}
              onValueChange={(val) =>
                setConvType(val as CreateConversationDtoType)
              }
            >
              <SelectTrigger aria-label='Loại cuộc trò chuyện'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='direct'>{chatUiCopy.direct}</SelectItem>
                <SelectItem value='group'>{chatUiCopy.group}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {convType === 'group' && (
            <div className='space-y-1.5'>
              <Label htmlFor='chat-conv-name'>Tên nhóm</Label>
              <Input
                id='chat-conv-name'
                value={convName}
                onChange={(e) => setConvName(e.target.value)}
                placeholder='VD: Nhóm Nhân sự & Tuyển dụng'
              />
            </div>
          )}
          <div className='space-y-1.5'>
            <Label>Thành viên tham gia</Label>
            {participantOptions.length > 0 && (
              <Select
                value={participantId}
                onValueChange={(val) => setParticipantId(val)}
              >
                <SelectTrigger aria-label='Chọn thành viên'>
                  <SelectValue placeholder='Chọn đồng nghiệp...' />
                </SelectTrigger>
                <SelectContent>
                  {participantOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder='Hoặc nhập User ID (cách nhau bởi dấu phẩy)'
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setCreateOpen(false)}>
            {commonUiCopy.cancel}
          </Button>
          <Button
            onClick={() => void handleCreateConversation()}
            disabled={createConversation.isPending || !participantId.trim()}
          >
            {commonUiCopy.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (!activeConv) {
    return (
      <div className='border-border/50 bg-background/70 flex h-[calc(100dvh-5.5rem)] w-full flex-col items-center justify-center gap-3 rounded-2xl border backdrop-blur-xl lg:rounded-3xl'>
        <p className='text-muted-foreground text-sm'>
          {conversations.length === 0
            ? chatUiCopy.noConversations
            : 'Chọn một cuộc trò chuyện để bắt đầu'}
        </p>
        <Button size='sm' onClick={() => setCreateOpen(true)}>
          <Icons.add className='mr-1.5 h-4 w-4' />
          Tạo cuộc trò chuyện mới
        </Button>
        {createDialog}
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
        onCreateClick={() => setCreateOpen(true)}
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
      {createDialog}
    </div>
  );
}
