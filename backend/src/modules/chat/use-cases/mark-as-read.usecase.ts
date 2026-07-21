import { Injectable } from "@nestjs/common";
import { ChatRepository } from "../repositories/chat.repository";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { throwForbidden } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

@Injectable()
export class MarkAsReadUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, MarkAsReadUseCase.name);
  }

  async execute(
    conversationId: string,
    messageId: string,
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

    await this.chatRepo.upsertReadReceipt(conversationId, actor.id, messageId);
  }
}



