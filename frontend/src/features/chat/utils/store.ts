import { create } from 'zustand';

type TypingEntry = {
  userId: string;
  username: string;
  timestamp: number;
};

type ChatState = {
  selectedConversationId: string | null;
  draft: string;
  typingUsers: Record<string, TypingEntry[]>;

  selectConversation: (id: string) => void;
  setDraft: (text: string) => void;
  setTyping: (
    conversationId: string,
    userId: string,
    username: string,
    isTyping: boolean
  ) => void;
  clearStaleTyping: () => void;
};

const STALE_MS = 5000;

export const useChatStore = create<ChatState>()((set) => ({
  selectedConversationId: null,
  draft: '',
  typingUsers: {},

  selectConversation: (id) => set({ selectedConversationId: id, draft: '' }),
  setDraft: (text) => set({ draft: text }),

  setTyping: (conversationId, userId, username, isTyping) =>
    set((state) => {
      const current = state.typingUsers[conversationId] ?? [];
      if (!isTyping) {
        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: current.filter((u) => u.userId !== userId)
          }
        };
      }
      const existing = current.find((u) => u.userId === userId);
      const updated = existing
        ? current.map((u) =>
            u.userId === userId ? { ...u, timestamp: Date.now() } : u
          )
        : [...current, { userId, username, timestamp: Date.now() }];
      return {
        typingUsers: { ...state.typingUsers, [conversationId]: updated }
      };
    }),

  clearStaleTyping: () => {
    const now = Date.now();
    set((state) => ({
      typingUsers: Object.fromEntries(
        Object.entries(state.typingUsers).map(([convId, users]) => [
          convId,
          users.filter((u) => now - u.timestamp < STALE_MS)
        ])
      )
    }));
  }
}));
