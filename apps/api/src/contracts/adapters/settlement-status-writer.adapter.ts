import { Inject, Injectable } from "@nestjs/common";
import { and, eq, lte, ne } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../infrastructure/database/schema";
import {
  ISettlementStatusWriterPort,
  SettlementLinkStatus,
} from "../ports/settlement-status-writer.port";

/**
 * Default timeout (15 minutes) after which a settlement link stuck in
 * `processing` is considered stale and eligible for recovery to `failed`.
 */
export const DEFAULT_STALE_SETTLEMENT_PROCESSING_MS = 15 * 60 * 1000;

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
    payrollRef?: string | null,
  ): Promise<void> {
    const condition =
      status === "settled"
        ? eq(schema.offboardingSettlementLinks.processId, processId)
        : and(
            eq(schema.offboardingSettlementLinks.processId, processId),
            ne(schema.offboardingSettlementLinks.status, "settled"),
          );

    await this.db
      .update(schema.offboardingSettlementLinks)
      .set({
        status,
        ...(payrollRef !== undefined ? { payrollRef } : {}),
        updatedAt: new Date(),
      })
      .where(condition);
  }

  async markProcessing(processId: string): Promise<void> {
    await this.setStatus(processId, "processing");
  }

  async markSettled(processId: string, payrollRef: string): Promise<void> {
    await this.setStatus(processId, "settled", payrollRef);
  }

  async markFailed(processId: string): Promise<void> {
    await this.setStatus(processId, "failed", null);
  }

  /**
   * Recovery mechanism for settlement links that remained in `processing` past
   * `staleThresholdMs` (e.g. due to process crash or temporary DB outage during
   * `markFailed`). Transitions stale `processing` rows to `failed` so they are
   * detectable and retryable.
   */
  async recoverStaleProcessing(
    staleThresholdMs: number = DEFAULT_STALE_SETTLEMENT_PROCESSING_MS,
    now: Date = new Date(),
  ): Promise<string[]> {
    const cutoff = new Date(now.getTime() - staleThresholdMs);
    const rows = await this.db
      .update(schema.offboardingSettlementLinks)
      .set({
        status: "failed",
        payrollRef: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.offboardingSettlementLinks.status, "processing"),
          lte(schema.offboardingSettlementLinks.updatedAt, cutoff),
        ),
      )
      .returning({ processId: schema.offboardingSettlementLinks.processId });
    return rows.map((r) => r.processId);
  }
}
