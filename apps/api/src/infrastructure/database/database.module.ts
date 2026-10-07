import { Global, Module } from "@nestjs/common";
import { databaseClientProvider, databaseProvider } from "./database.provider";
import { DatabaseShutdownService } from "./database-shutdown.service";
import { DatabaseHealthIndicator } from "./database-health.indicator";
import { ScopedDbService } from "./scoped-db.service";
import { TransactionRunner } from "./transaction-runner";
import { RequestContextModule } from "../../shared/context/request-context.module";
import { DATABASE_CLIENT, DATABASE_CONNECTION } from "./database.tokens";
import { EventIdempotencyRepository } from "../repositories/event-idempotency.repository";

@Global()
@Module({
  imports: [RequestContextModule],
  providers: [
    databaseClientProvider,
    databaseProvider,
    DatabaseShutdownService,
    DatabaseHealthIndicator,
    ScopedDbService,
    TransactionRunner,
    EventIdempotencyRepository,
  ],
  exports: [
    DATABASE_CLIENT,
    DATABASE_CONNECTION,
    DatabaseHealthIndicator,
    ScopedDbService,
    TransactionRunner,
    EventIdempotencyRepository,
  ],
})
export class DatabaseModule {}
