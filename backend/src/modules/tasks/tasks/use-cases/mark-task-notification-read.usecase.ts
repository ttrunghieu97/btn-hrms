import { Injectable } from "@nestjs/common";
import { TaskNotificationsService } from "../notifications/task-notifications.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class MarkTaskNotificationReadUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly notifications: TaskNotificationsService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, MarkTaskNotificationReadUseCase.name);
  }

  execute(userId: string, id: string) {
    return this.notifications.markRead(userId, id);
  }
}
