import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { extractList, unwrapData } from '@/lib/api-extract';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import { chatControllerList, chatControllerMessages, chatControllerCreate } from '@/api/generated/endpoints';
import type { CreateConversationDto } from '@/api/generated/model';
import type { Conversation, Message } from '../utils/types';

export const chatKeys = {
  ...createKeyFactory('chat'),
  messages: (conversationId: string) =>
    ['chat', 'messages', conversationId] as const,
};

export function useConversationsQuery() {
  return useQuery({
    queryKey: chatKeys.lists(),
    queryFn: () => chatControllerList(),
    select: (data) => extractList<Conversation>(data),
    ...queryPolicyPresets['fast-changing']
  });
}

export function useMessagesQuery(conversationId: string | null) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId ?? ''),
    queryFn: () => chatControllerMessages(conversationId!),
    enabled: !!conversationId,
    select: (data) => extractList<Message>(data),
    ...queryPolicyPresets['fast-changing']
  });
}

export function useCreateConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConversationDto) => chatControllerCreate(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.all() });
    }
  });
}
