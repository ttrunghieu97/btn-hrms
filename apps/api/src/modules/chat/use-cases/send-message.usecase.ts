import { Injectable } from "@nestjs/common";
import { ChatRepository } from "../repositories/chat.repository";
import { ChatMapper } from "../mappers/chat.mapper";
import { SendMessageDto } from "../dto/send-message.dto";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { throwForbidden } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

@Injectable()
export class SendMessageUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      SendMessageUseCase.name,
    );
  }

  async execute(
    conversationId: string,
    dto: SendMessageDto,
    actor: AuthUser,
  ) {
    const participant = await this.chatRepo.findParticipant(
      conversationId,
      actor.id,
    );
    if (!participant) {
      throwForbidden(
        "Not a participant of this conversation",
        ERROR_CODES.CHAT_NOT_PARTICIPANT,
      );
    }

    const message = await this.chatRepo.createMessage({
      conversationId,
      senderUserId: actor.id,
      content: dto.content,
      type: dto.attachments?.length ? "attachment" : "text",
      attachments: dto.attachments,
    });

    this.logger.log(
      `Message sent in conversation ${conversationId} by ${actor.id}`,
    );

    return ChatMapper.toMessageDto({
      ...message,
      senderUsername: actor.username,
    });
  }
}



