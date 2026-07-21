export type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  mimeType?: string;
  url?: string;
};

export type MessageSender = {
  userId: string;
  username: string | null;
};

export type Message = {
  id: string;
  conversationId: string;
  sender: MessageSender;
  senderRole: 'self' | 'other';
  type: 'text' | 'attachment' | 'system';
  content: string | null;
  attachments?: Attachment[];
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
};

export type ConversationStatus = 'online' | 'offline';

export type Participant = {
  userId: string;
  username: string | null;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
};

export type Conversation = {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  unreadCount: number;
  participants: Participant[];
  lastMessage: Message | null;
  createdAt: string;
  updatedAt: string;
};

export type TypingUser = {
  userId: string;
  username: string;
};
