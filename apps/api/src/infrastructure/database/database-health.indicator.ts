import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { AppDatabase } from "./database-client.type";
import { DATABASE_CONNECTION } from "./database.tokens";

export interface DatabaseHealthResult {
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
  ) {}

  async check(): Promise<DatabaseHealthResult> {
    const start = Date.now();
    try {
      await Promise.race([
        this.db.execute(sql`SELECT 1`),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("DB health check timeout")), 1000),
        ),
      ]);
      return { status: "up", latencyMs: Date.now() - start };
    } catch (err) {
      return {
        status: "down",
        latencyMs: Date.now() - start,
        error: (err as Error).message,
      };
    }
  }
}
