import {
  Body,
  Controller,
  Headers,
  Post,
} from "@nestjs/common";
import { throwUnauthorized } from "../../shared/utils/http-error";
import { ERROR_CODES } from "../../shared/constants/error-codes";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "../../core/security/decorators/require-permission.decorator";
import { Permissions } from "../../core/security/permissions/permissions.registry";
import { signWebhookPayload } from "./webhook-signature";

@ApiTags("Integration Hub")
@ApiBearerAuth()
@Controller("integrations/inbound")
export class InboundAdapterController {
  @Post("generic")
  @RequirePermission(Permissions.SYS_ALL)
  @ApiOperation({ summary: "Inbound adapter skeleton (validation + mapping placeholder)" })
  async ingest(
    @Headers("x-integration-type") integrationType: string,
    @Headers("x-hub-signature-256") signature: string | undefined,
    @Body() body: unknown,
  ) {
    const secret = String(process.env.WEBHOOK_SECRET || "").trim();
    if (secret) {
      const expectedSignature = signWebhookPayload(secret, JSON.stringify(body ?? {}));
      if (signature !== expectedSignature) {
        throwUnauthorized(
          "Invalid webhook signature",
          ERROR_CODES.AUTH_TOKEN_INVALID,
          { reason: "INVALID_WEBHOOK_SIGNATURE" },
        );
      }
    }

    return {
      data: {
        integrationType: integrationType ?? null,
        received: true,
        body,
      },
      meta: {},
    };
  }
}
