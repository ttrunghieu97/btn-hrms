import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "../../core/security/decorators/require-permission.decorator";
import { Permissions } from "../../core/security/permissions/permissions.registry";
import { CreateConversationUseCase } from "./use-cases/create-conversation.usecase";
import { ListConversationsUseCase } from "./use-cases/list-conversations.usecase";
import { GetMessagesUseCase } from "./use-cases/get-messages.usecase";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { ListMessagesDto } from "./dto/list-messages.dto";
import type { AuthUser } from "../../core/security/types/auth-user.interface";

@ApiTags("Chat")
@ApiBearerAuth()
@Controller("chat")
export class ChatController {
  constructor(
    private readonly createConversation: CreateConversationUseCase,
    private readonly listConversations: ListConversationsUseCase,
    private readonly getMessages: GetMessagesUseCase,
  ) {}

  @Post("conversations")
  @RequirePermission(Permissions.CHAT_SEND)
  @ApiOperation({ summary: "Create a conversation" })
  create(
    @Body() dto: CreateConversationDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.createConversation.execute(dto, req.user);
  }

  @Get("conversations")
  @RequirePermission(Permissions.CHAT_VIEW)
  @ApiOperation({ summary: "List conversations" })
  list(@Req() req: { user: AuthUser }) {
    return this.listConversations.execute(req.user);
  }

  @Get("conversations/:id/messages")
  @RequirePermission(Permissions.CHAT_VIEW)
  @ApiOperation({ summary: "Get messages in a conversation" })
  messages(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() query: ListMessagesDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.getMessages.execute(id, query, req.user);
  }
}



