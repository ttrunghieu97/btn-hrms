import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { systemHealthChecks } from "../../../../infrastructure/database/schema";
import type { ComponentHealthDto } from "../dto/system-health-response.dto";

@Injectable()
export class SystemHealthRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  async pingDatabase() {
    await this.db.execute(sql`SELECT 1`);
  }

  async insertHealthCheck(component: ComponentHealthDto) {
    await this.db.insert(systemHealthChecks).values({
      component: component.name,
      status: component.status,
      latencyMs: component.latencyMs,
      error: component.error ?? null,
      details: {},
    });
  }
}
