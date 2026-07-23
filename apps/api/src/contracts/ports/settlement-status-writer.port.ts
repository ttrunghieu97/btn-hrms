import { type InjectionToken } from "@nestjs/common";

/**
 * Settlement lifecycle status of an offboarding settlement link.
 * Mirrors offboarding's settlement_status_enum. Defined here so the
 * contract stays self-contained — consumers (payroll) never import the
 * offboarding domain model.
 */
export type SettlementLinkStatus = "pending" | "processing" | "settled" | "failed";

/**
 * Write-back port for final-settlement status.
 *
 * Offboarding OWNS the `offboarding_settlement_links` aggregate; payroll
 * computes the settlement but must not touch offboarding's tables directly.
 * Payroll depends on this port to report progress back; offboarding provides
 * the adapter. Keyed by `processId` (unique per offboarding process).
 */
export interface ISettlementStatusWriterPort {
  /** Mark that payroll has begun computing the settlement. */
  markProcessing(processId: string): Promise<void>;
  /** Mark the settlement complete, recording the payroll-side reference. */
  markSettled(processId: string, payrollRef: string): Promise<void>;
  /** Mark the settlement failed (e.g. no current salary structure). */
  markFailed(processId: string): Promise<void>;
}

export const SETTLEMENT_STATUS_WRITER_PORT: InjectionToken = Symbol(
  "SETTLEMENT_STATUS_WRITER_PORT",
);
