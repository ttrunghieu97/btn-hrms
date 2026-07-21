import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatGateway } from "./chat.gateway";
import { AuthModule } from "../identity/auth/auth.module";
import { ChatRepository } from "./repositories/chat.repository";
import { ChatPubSubService } from "./chat-pubsub.service";
import { CreateConversationUseCase } from "./use-cases/create-conversation.usecase";
import { ListConversationsUseCase } from "./use-cases/list-conversations.usecase";
import { GetMessagesUseCase } from "./use-cases/get-messages.usecase";
import { SendMessageUseCase } from "./use-cases/send-message.usecase";
import { MarkAsReadUseCase } from "./use-cases/mark-as-read.usecase";

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [
    ChatRepository,
    ChatPubSubService,
    ChatGateway,
    CreateConversationUseCase,
    ListConversationsUseCase,
    GetMessagesUseCase,
    SendMessageUseCase,
    MarkAsReadUseCase,
  ],
})
export class ChatDomainModule {}



