import { Injectable } from "@nestjs/common";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { throwBadRequest } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { IntegrationHubRepository } from "../integration-hub.repository";
import { validateOutboundWebhookUrl } from "../webhook-target-policy";

@Injectable()
export class CreateWebhookSubscriptionUseCase {
  constructor(
    private readonly repo: IntegrationHubRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(input: {
    eventType: string;
    targetUrl: string;
    secret: string;
    status?: "active" | "disabled";
  }) {
    const scopeId = this.scopeIdOrThrow();

    const rows = await this.repo.createSubscription({
      ...input,
      targetUrl: validateOutboundWebhookUrl(input.targetUrl),
    });
    return rows[0] ?? null;
  }

  private scopeIdOrThrow() {
    try {
      return this.requestContext.getScopeIdOrThrow();
    } catch {
      throwBadRequest("Company scope is required", ERROR_CODES.INVALID_REQUEST);
    }
  }
}
