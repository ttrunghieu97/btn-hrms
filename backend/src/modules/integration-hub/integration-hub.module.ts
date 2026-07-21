import { Module } from "@nestjs/common";
import { IntegrationHubRepository } from "./integration-hub.repository";
import { WebhookSubscriptionsController } from "./webhook-subscriptions.controller";
import { WebhookDispatcherConsumer } from "./webhook-dispatcher.consumer";
import { InboundAdapterController } from "./inbound-adapter.controller";
import { CreateWebhookSubscriptionUseCase } from "./use-cases/create-webhook-subscription.usecase";
import { ListWebhookSubscriptionsUseCase } from "./use-cases/list-webhook-subscriptions.usecase";
import { UpdateWebhookSubscriptionUseCase } from "./use-cases/update-webhook-subscription.usecase";
import { DeleteWebhookSubscriptionUseCase } from "./use-cases/delete-webhook-subscription.usecase";

@Module({
  controllers: [
    WebhookSubscriptionsController,
    InboundAdapterController,
  ],
  providers: [
    IntegrationHubRepository,
    WebhookDispatcherConsumer,
    CreateWebhookSubscriptionUseCase,
    ListWebhookSubscriptionsUseCase,
    UpdateWebhookSubscriptionUseCase,
    DeleteWebhookSubscriptionUseCase,
  ],
  exports: [],
})
export class IntegrationHubDomainModule {}
