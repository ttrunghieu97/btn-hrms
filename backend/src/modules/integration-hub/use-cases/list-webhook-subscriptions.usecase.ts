import { Injectable } from "@nestjs/common";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { throwBadRequest } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { IntegrationHubRepository } from "../integration-hub.repository";

@Injectable()
export class ListWebhookSubscriptionsUseCase {
  constructor(
    private readonly repo: IntegrationHubRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute() {
    this.scopeIdOrThrow();
    return this.repo.listSubscriptions();
  }

  private scopeIdOrThrow() {
    try {
      return this.requestContext.getScopeIdOrThrow();
    } catch {
      throwBadRequest("Company scope is required", ERROR_CODES.INVALID_REQUEST);
    }
  }
}
