import { Injectable } from "@nestjs/common";
import { ChatRepository } from "../repositories/chat.repository";
import { ChatMapper } from "../mappers/chat.mapper";
import { CreateConversationDto } from "../dto/create-conversation.dto";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { throwBadRequest } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

@Injectable()
export class CreateConversationUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      CreateConversationUseCase.name,
    );
  }

  async execute(dto: CreateConversationDto, actor: AuthUser) {
    if (dto.type === "direct") {
      if (dto.participantUserIds.length !== 1) {
        throwBadRequest(
          "Direct conversation requires exactly 1 other participant",
          ERROR_CODES.CHAT_INVALID_PARTICIPANT_COUNT,
        );
      }
      const otherUserId = dto.participantUserIds[0]!;
      const conv = await this.chatRepo.findOrCreateDirect(
        actor.id,
        otherUserId,
      );
      const participants = await this.chatRepo.getParticipantsWithUser(conv.id);
      const unreadCount = await this.chatRepo.getUnreadCount(conv.id, actor.id);
      this.logger.log(`Direct conversation created/found: ${conv.id}`);
      return ChatMapper.toConversationDto({
        ...conv,
        participants,
        lastMessage: null,
        unreadCount,
      });
    }

    if (!dto.name?.trim()) {
      throwBadRequest(
        "Group conversation requires a name",
        ERROR_CODES.INVALID_REQUEST,
      );
    }

    const conv = await this.chatRepo.transaction(async () => {
      const record = await this.chatRepo.createConversation({
        type: "group",
        name: dto.name,
        createdByUserId: actor.id,
      });

      await this.chatRepo.addParticipants(record!.id, [
        { userId: actor.id, role: "owner" },
        ...dto.participantUserIds.map((uid) => ({ userId: uid })),
      ]);

      return record;
    });

    const participants = await this.chatRepo.getParticipantsWithUser(conv!.id);
    this.logger.log(`Group conversation created: ${conv!.id}`);
    return ChatMapper.toConversationDto({
      ...conv!,
      participants,
      lastMessage: null,
      unreadCount: 0,
    });
  }
}



