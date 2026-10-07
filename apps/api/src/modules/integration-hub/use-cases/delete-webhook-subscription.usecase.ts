import { Injectable } from "@nestjs/common";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { throwBadRequest, throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { IntegrationHubRepository } from "../integration-hub.repository";

@Injectable()
export class DeleteWebhookSubscriptionUseCase {
  constructor(
    private readonly repo: IntegrationHubRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string) {
    this.scopeIdOrThrow();

    const rows = await this.repo.deleteSubscription({ id });
    const deleted = rows[0] ?? null;
    if (!deleted) {
      throwNotFound("Webhook subscription not found", ERROR_CODES.WEBHOOK_SUBSCRIPTION_NOT_FOUND, {
        id,
      });
    }
    return { id };
  }

  private scopeIdOrThrow() {
    try {
      return this.requestContext.getScopeIdOrThrow();
    } catch {
      throwBadRequest("Company scope is required", ERROR_CODES.INVALID_REQUEST);
    }
  }
}
