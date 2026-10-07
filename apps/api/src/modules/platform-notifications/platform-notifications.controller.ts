import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
} from "./dto/notification-template.dto";
import { UpdateNotificationPreferencesDto } from "./dto/notification-preferences.dto";
import { SendNotificationDto } from "./dto/send-notification.dto";
import { AuthorizationGuard } from "../../core/security/guards/authorization.guard";
import { RequirePermission } from "../../core/security/decorators/require-permission.decorator";
import { AuthUser } from "../../core/security/types/auth-user.interface";
import { CreateNotificationTemplateUseCase } from "./use-cases/create-notification-template.usecase";
import { UpdateNotificationTemplateUseCase } from "./use-cases/update-notification-template.usecase";
import { GetNotificationTemplateUseCase } from "./use-cases/get-notification-template.usecase";
import { ListNotificationTemplatesUseCase } from "./use-cases/list-notification-templates.usecase";
import { GetNotificationPreferencesUseCase } from "./use-cases/get-notification-preferences.usecase";
import { UpdateNotificationPreferencesUseCase } from "./use-cases/update-notification-preferences.usecase";
import { GetUserNotificationsUseCase } from "./use-cases/get-user-notifications.usecase";
import { SendNotificationUseCase } from "./use-cases/send-notification.usecase";

@ApiTags("Platform Notifications")
@ApiBearerAuth()
@Controller("platform-notifications")
@UseGuards(AuthorizationGuard)
export class PlatformNotificationsController {
  constructor(
    private readonly createTemplateUseCase: CreateNotificationTemplateUseCase,
    private readonly updateTemplateUseCase: UpdateNotificationTemplateUseCase,
    private readonly getTemplateUseCase: GetNotificationTemplateUseCase,
    private readonly listTemplatesUseCase: ListNotificationTemplatesUseCase,
    private readonly getPreferencesUseCase: GetNotificationPreferencesUseCase,
    private readonly updatePreferencesUseCase: UpdateNotificationPreferencesUseCase,
    private readonly getUserNotificationsUseCase: GetUserNotificationsUseCase,
    private readonly sendNotificationUseCase: SendNotificationUseCase,
  ) {}

  // --- Templates (Admin Only) ---

  @Post("templates")
  @RequirePermission("manage:platform")
  @ApiOperation({ summary: "Create a notification template (admin)" })
  createTemplate(@Body() dto: CreateNotificationTemplateDto) {
    return this.createTemplateUseCase.execute(dto);
  }

  @Get("templates")
  @RequirePermission("manage:platform")
  @ApiOperation({ summary: "List notification templates (admin)" })
  listTemplates() {
    return this.listTemplatesUseCase.execute();
  }

  @Get("templates/:id")
  @RequirePermission("manage:platform")
  @ApiOperation({ summary: "Get notification template (admin)" })
  getTemplate(@Param("id") id: string) {
    return this.getTemplateUseCase.execute(id);
  }

  @Patch("templates/:id")
  @RequirePermission("manage:platform")
  @ApiOperation({ summary: "Update notification template (admin)" })
  updateTemplate(
    @Param("id") id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    return this.updateTemplateUseCase.execute(id, dto);
  }

  // --- User Preferences ---

  @Get("preferences")
  @RequirePermission("notifications:preferences:view:self")
  @ApiOperation({ summary: "Get current user's notification preferences" })
  getPreferences(@Req() req: { user: AuthUser }) {
    const userId = req.user.id;
    return this.getPreferencesUseCase.execute(userId);
  }

  @Patch("preferences")
  @RequirePermission("notifications:preferences:edit:self")
  @ApiOperation({ summary: "Update current user's notification preferences" })
  updatePreferences(
    @Req() req: { user: AuthUser },
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const userId = req.user.id;
    return this.updatePreferencesUseCase.execute(userId, dto);
  }

  // --- User Notifications ---

  @Get("my-notifications")
  @RequirePermission("notifications:view:self")
  @ApiOperation({ summary: "List current user's notifications" })
  getMyNotifications(@Req() req: { user: AuthUser }) {
    const userId = req.user.id;
    return this.getUserNotificationsUseCase.execute(userId);
  }

  // --- Internal / System endpoints ---

  @Post("send")
  @RequirePermission("manage:platform")
  @ApiOperation({ summary: "Send a notification (admin/system)" })
  sendNotification(@Body() dto: SendNotificationDto) {
    return this.sendNotificationUseCase.execute(dto);
  }
}
