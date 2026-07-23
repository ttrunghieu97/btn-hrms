import { Injectable } from "@nestjs/common";
import { AuthUser } from "../../../../core/security/types/auth-user.interface";
import { TaskEventsService } from "../realtime/task-events.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class StreamTaskEventsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly taskEvents: TaskEventsService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, StreamTaskEventsUseCase.name);
  }

  execute(
    user: AuthUser,
    request: {
      headers?: Record<string, any>;
      query?: Record<string, any>;
    },
  ) {
    const lastEventId =
      request?.headers?.["last-event-id"] ||
      request?.headers?.["Last-Event-ID"] ||
      request?.query?.lastEventId ||
      undefined;

    return this.taskEvents.streamForUser(
      user,
      lastEventId ? String(lastEventId) : undefined,
    );
  }
}

