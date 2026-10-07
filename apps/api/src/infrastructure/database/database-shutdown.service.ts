import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import type postgres from "postgres";
import { DATABASE_CLIENT } from "./database.tokens";
import { RequestContextService } from "../../shared/context/request-context.service";
import { ContextLogger } from "../../shared/logging/context-logger";

@Injectable()
export class DatabaseShutdownService implements OnModuleDestroy {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly client: postgres.Sql,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      DatabaseShutdownService.name,
    );
  }

  async onModuleDestroy() {
    if (!this.client || typeof this.client.end !== "function") return;

    try {
      await this.client.end({ timeout: 5 });
    } catch (err) {
      this.logger.warn(
        `Failed to close DB client: ${(err as any)?.message ?? err}`,
      );
    }
  }
}
