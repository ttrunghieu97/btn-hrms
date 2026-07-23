import { Injectable } from "@nestjs/common";
import { TaskNotificationsService } from "../notifications/task-notifications.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListTaskNotificationsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly notifications: TaskNotificationsService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListTaskNotificationsUseCase.name);
  }

  execute(userId: string) {
    return this.notifications.listForUser(userId);
  }
}
