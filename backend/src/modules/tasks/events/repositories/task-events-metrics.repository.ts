import {  Inject , Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";

const MAX_RETRIES = 1;
const RETRYABLE_CODES = new Set(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT"]);

@Injectable()
export class TaskEventsMetricsRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  async countUnprocessed(): Promise<number> {
    let lastError: any;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const [result] = await this.db.execute(
          sql`SELECT count(*) as count FROM task_events WHERE processed = false`,
        );
        return Number((result as { count: number })?.count ?? 0);
      } catch (err: any) {
        lastError = err;
        if (attempt < MAX_RETRIES && (err)?.cause?.code && RETRYABLE_CODES.has((err).cause.code)) {
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }
}





