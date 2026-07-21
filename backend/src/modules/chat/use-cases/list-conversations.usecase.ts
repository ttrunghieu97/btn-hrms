import { Injectable } from "@nestjs/common";
import { ChatRepository } from "../repositories/chat.repository";
import { ChatMapper } from "../mappers/chat.mapper";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

@Injectable()
export class ListConversationsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListConversationsUseCase.name);
  }

  async execute(actor: AuthUser) {
    const rows = await this.chatRepo.findConversationsForUser(actor.id);
    return rows.map((r) => ChatMapper.toConversationDto(r));
  }
}



