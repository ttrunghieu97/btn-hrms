import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "../../core/security/decorators/require-permission.decorator";
import { Permissions } from "../../core/security/permissions/permissions.registry";
import { CreateWebhookSubscriptionUseCase } from "./use-cases/create-webhook-subscription.usecase";
import { ListWebhookSubscriptionsUseCase } from "./use-cases/list-webhook-subscriptions.usecase";
import { UpdateWebhookSubscriptionUseCase } from "./use-cases/update-webhook-subscription.usecase";
import { DeleteWebhookSubscriptionUseCase } from "./use-cases/delete-webhook-subscription.usecase";
import { CreateWebhookSubscriptionDto } from "./dto/create-webhook-subscription.dto";
import { UpdateWebhookSubscriptionDto } from "./dto/update-webhook-subscription.dto";

@ApiTags("Integration Hub")
@ApiBearerAuth()
@Controller("integrations/webhooks")
export class WebhookSubscriptionsController {
  constructor(
    private readonly createUseCase: CreateWebhookSubscriptionUseCase,
    private readonly listUseCase: ListWebhookSubscriptionsUseCase,
    private readonly updateUseCase: UpdateWebhookSubscriptionUseCase,
    private readonly deleteUseCase: DeleteWebhookSubscriptionUseCase,
  ) {}

  @Post()
  @RequirePermission(Permissions.SYS_ALL)
  @ApiOperation({ summary: "Create a webhook subscription" })
  create(@Body() dto: CreateWebhookSubscriptionDto) {
    return this.createUseCase.execute(dto);
  }

  @Get()
  @RequirePermission(Permissions.SYS_ALL)
  @ApiOperation({ summary: "List webhook subscriptions" })
  list() {
    return this.listUseCase.execute();
  }

  @Patch(":id")
  @RequirePermission(Permissions.SYS_ALL)
  @ApiOperation({ summary: "Update a webhook subscription" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateWebhookSubscriptionDto,
  ) {
    return this.updateUseCase.execute(id, dto);
  }

  @Delete(":id")
  @RequirePermission(Permissions.SYS_ALL)
  @ApiOperation({ summary: "Delete a webhook subscription" })
  remove(@Param("id") id: string) {
    return this.deleteUseCase.execute(id);
  }
}
