import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { UseGuards, Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { sanitizeText, sanitizeAttachmentName } from "../../shared/utils/sanitize-text";
import { WsJwtGuard } from "../../core/security/guards/ws-jwt.guard";
import { ChatRepository } from "./repositories/chat.repository";
import { SendMessageUseCase } from "./use-cases/send-message.usecase";
import { MarkAsReadUseCase } from "./use-cases/mark-as-read.usecase";
import { ChatPubSubService } from "./chat-pubsub.service";
import type { AuthUser } from "../../core/security/types/auth-user.interface";

const PUBSUB_CHANNEL = "hrms:chat:events";

function roomName(conversationId: string): string {
  return `chat:conv:${conversationId}`;
}

@WebSocketGateway({
  namespace: "/chat",
  cors: {
    origin: (process.env.APP_URL || "").split(",").map((s) => s.trim()).filter(Boolean),
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly sendMessage: SendMessageUseCase,
    private readonly markAsRead: MarkAsReadUseCase,
    private readonly chatPubSub: ChatPubSubService,
  ) {}

  async afterInit() {
    await this.chatPubSub.subscribe(PUBSUB_CHANNEL, (data: any) => {
      if (!data?.event || !data?.room) return;
      if (data.excludeSocketId) {
        this.server
          .to(data.room)
          .except(data.excludeSocketId)
          .emit(data.event, data.payload);
      } else {
        this.server.to(data.room).emit(data.event, data.payload);
      }
    });
    this.logger.log("Chat gateway initialized");
  }

  async handleConnection(client: Socket) {
    const user = client.data.user as AuthUser | undefined;
    if (!user) {
      client.disconnect();
      return;
    }

    const conversationIds = await this.chatRepo.findConversationIds(user.id);
    const rooms = conversationIds.map(roomName);
    if (rooms.length) {
      await client.join(rooms);
    }

    client.emit("connected", {
      userId: user.id,
      username: user.username,
      rooms: conversationIds,
    });

    this.logger.log(`User ${user.username} connected (${conversationIds.length} rooms)`);
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as AuthUser | undefined;
    if (user) {
      this.logger.debug(`User ${user.username} disconnected`);
    }
  }

  @SubscribeMessage("join_room")
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    const user = client.data.user as AuthUser;
    const participant = await this.chatRepo.findParticipant(
      conversationId,
      user.id,
    );
    if (!participant) return;
    await client.join(roomName(conversationId));
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      conversationId: string;
      content: string;
      attachments?: {
        name: string;
        size: number;
        mimeType: string;
        url: string;
      }[];
    },
  ) {
    const user = client.data.user as AuthUser;

    try {
      const message = await this.sendMessage.execute(
        payload.conversationId,
        { content: sanitizeText(payload.content), attachments: payload.attachments?.map(function(a) { return { ...a, name: sanitizeAttachmentName(a.name) }; }) },
        user,
      );

      const room = roomName(payload.conversationId);
      this.server.to(room).emit("new_message", message);

      void this.chatPubSub.publish(PUBSUB_CHANNEL, {
        event: "new_message",
        room,
        payload: message,
      });

      return message;
    } catch (err: unknown  ) {
      client.emit("error", {
        event: "send_message",
        message: err instanceof Error ? err.message : "Failed to send message",
      });
      return null;
    }
  }

  @SubscribeMessage("typing")
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { conversationId: string; isTyping: boolean },
  ) {
    const user = client.data.user as AuthUser;
    const room = roomName(payload.conversationId);
    const typingData = {
      userId: user.id,
      username: user.username,
      isTyping: payload.isTyping,
    };

    client.to(room).emit("typing", typingData);

    void this.chatPubSub.publish(PUBSUB_CHANNEL, {
      event: "typing",
      room,
      payload: typingData,
      excludeSocketId: client.id,
    });
  }

  @SubscribeMessage("mark_read")
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { conversationId: string; messageId: string },
  ) {
    const user = client.data.user as AuthUser;
    try {
      await this.markAsRead.execute(
        payload.conversationId,
        payload.messageId,
        user,
      );
    } catch (err: unknown  ) {
      this.logger.error(`mark_read failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}







