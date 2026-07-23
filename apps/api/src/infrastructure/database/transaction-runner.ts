import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "./database.provider";
import type { AppDatabase, AppTransaction } from "./database-client.type";

/**
 * UseCase-level transaction boundary.
 *
 * Ensures atomic multi-repository operations:
 *
 * ```ts
 * class SomeUseCase {
 *   constructor(private readonly tx: TransactionRunner) {}
 *
 *   async execute() {
 *     // 1. Validation reads outside tx (keep window short)
 *     const entity = await this.repo.findById(input.id);
 *
 *     // 2. Writes + event staging inside tx (atomic)
 *     return this.tx.run(async (tx) => {
 *       await this.repo1.update(input.id, input.data, tx);
 *       await this.repo2.create(input.related, tx);
 *       await this.eventOutbox.stage(new Event(...), tx);
 *     });
 *
 *     // 3. External IO (S3, email) after tx commits
 *   }
 * }
 * ```
 *
 * Rules:
 * - One transaction per business operation.
 * - Validation reads BEFORE the transaction.
 * - External IO AFTER the transaction commits.
 * - Domain events MUST be staged INSIDE the transaction.
 * - Do NOT nest transactions (call tx.run() inside tx.run()).
 */
@Injectable()
export class TransactionRunner {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
  ) {}

  /** Executes `fn` inside a single DB transaction. Rollback on error. */
  async run<T>(fn: (tx: AppTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }
}
