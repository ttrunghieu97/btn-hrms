import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../infrastructure/database/schema";
import {
  ISettlementStatusWriterPort,
  SettlementLinkStatus,
} from "../ports/settlement-status-writer.port";

/**
 * Writes settlement-link status directly against offboarding's table from the
 * contracts layer (same sanctioned boundary as AttendanceSummaryWriterAdapter),
 * so payroll never imports the offboarding module. Keyed by processId (unique).
 */
@Injectable()
export class SettlementStatusWriterAdapter implements ISettlementStatusWriterPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async setStatus(
    processId: string,
    status: SettlementLinkStatus,
    payrollRef?: string,
  ): Promise<void> {
    await this.db
      .update(schema.offboardingSettlementLinks)
      .set({
        status,
        ...(payrollRef !== undefined ? { payrollRef } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.offboardingSettlementLinks.processId, processId));
  }

  async markProcessing(processId: string): Promise<void> {
    await this.setStatus(processId, "processing");
  }

  async markSettled(processId: string, payrollRef: string): Promise<void> {
    await this.setStatus(processId, "settled", payrollRef);
  }

  async markFailed(processId: string): Promise<void> {
    await this.setStatus(processId, "failed");
  }
}
