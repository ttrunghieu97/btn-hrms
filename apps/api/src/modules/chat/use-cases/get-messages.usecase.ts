import { Injectable } from "@nestjs/common";
import { ChatRepository } from "../repositories/chat.repository";
import { ChatMapper } from "../mappers/chat.mapper";
import { ListMessagesDto } from "../dto/list-messages.dto";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { throwForbidden } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

@Injectable()
export class GetMessagesUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetMessagesUseCase.name);
  }

  async execute(
    conversationId: string,
    query: ListMessagesDto,
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

    const messages = await this.chatRepo.findMessages(conversationId, {
      before: query.before,
      limit: query.limit,
    });

    return messages.map((m) => ChatMapper.toMessageDto(m));
  }
}



