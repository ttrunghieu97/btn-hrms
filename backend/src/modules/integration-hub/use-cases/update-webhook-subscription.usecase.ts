import { Injectable } from "@nestjs/common";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { throwBadRequest, throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { IntegrationHubRepository } from "../integration-hub.repository";
import { validateOutboundWebhookUrl } from "../webhook-target-policy";

@Injectable()
export class UpdateWebhookSubscriptionUseCase {
  constructor(
    private readonly repo: IntegrationHubRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(
    id: string,
    input: {
      targetUrl?: string;
      secret?: string;
      status?: "active" | "disabled";
    },
  ) {
    this.scopeIdOrThrow();

    const rows = await this.repo.updateSubscription({
      id,
      ...(input.targetUrl ? { targetUrl: validateOutboundWebhookUrl(input.targetUrl) } : {}),
      ...input,
    });
    const updated = rows[0] ?? null;
    if (!updated) {
      throwNotFound("Webhook subscription not found", ERROR_CODES.WEBHOOK_SUBSCRIPTION_NOT_FOUND, {
        id,
      });
    }
    return updated;
  }

  private scopeIdOrThrow() {
    try {
      return this.requestContext.getScopeIdOrThrow();
    } catch {
      throwBadRequest("Company scope is required", ERROR_CODES.INVALID_REQUEST);
    }
  }
}
