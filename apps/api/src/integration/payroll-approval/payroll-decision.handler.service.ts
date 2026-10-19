import { Injectable, Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "@/infrastructure/database/database.tokens";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";
import * as schema from "@/infrastructure/database/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";
import {
  isProvisionalPayrollRunRecord,
  isProvisionalPayslipMetadata,
  resolveCurrentCycleApprovalHistory,
} from "@/modules/payroll/payroll-runs/use-cases/payroll-runs.usecases";
import { nextApprovalHistoryTimestamp } from "@/modules/payroll/payroll-runs/repositories/payroll-runs.repository";

@Injectable()
export class PayrollDecisionHandler {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, PayrollDecisionHandler.name);
  }

  private async loadApprovalHistoryRows(
    targetDb: unknown,
    payrollRunId: string,
  ): Promise<Array<{
    action?: string | null;
    performedByUserId?: string | null;
    comment?: string | null;
  }> | null> {
    const dbAny = targetDb as any;
    if (typeof dbAny?.query?.payrollRunApprovalHistory?.findMany === "function") {
      const rows = await dbAny.query.payrollRunApprovalHistory.findMany({
        where: eq(schema.payrollRunApprovalHistory.payrollRunId, payrollRunId),
        orderBy: [
          asc(schema.payrollRunApprovalHistory.createdAt),
          asc(schema.payrollRunApprovalHistory.id),
        ],
      });
      return Array.isArray(rows) ? rows : [];
    }
    if (typeof dbAny?.select === "function") {
      const rows = await dbAny
        .select()
        .from(schema.payrollRunApprovalHistory)
        .where(eq(schema.payrollRunApprovalHistory.payrollRunId, payrollRunId))
        .orderBy(
          asc(schema.payrollRunApprovalHistory.createdAt),
          asc(schema.payrollRunApprovalHistory.id),
        );
      return Array.isArray(rows) ? rows : [];
    }
    return null;
  }

  private validateCycleAndSoD(params: {
    payrollRunId: string;
    validApprovalRequester: string | null;
    historyRows: Array<{
      action?: string | null;
      performedByUserId?: string | null;
      comment?: string | null;
    }> | null;
    decidedByUserId: string;
  }): { ok: boolean; effectiveRequesterId: string | null; reason?: string } {
    const {
      payrollRunId,
      validApprovalRequester,
      historyRows,
      decidedByUserId,
    } = params;

    let validHistoryRequester: string | null = null;
    if (historyRows !== null) {
      const cycle = resolveCurrentCycleApprovalHistory(historyRows);
      if (historyRows.length > 0) {
        if (
          cycle.isMalformed ||
          !cycle.requesterUserId ||
          (cycle.latestAction !== "REQUESTED" &&
            cycle.latestAction !== "RESUBMITTED")
        ) {
          return {
            ok: false,
            effectiveRequesterId: null,
            reason: `Missing, stale, or malformed current-cycle requester in approval history on payroll run ${payrollRunId}`,
          };
        }
        if (
          validApprovalRequester &&
          validApprovalRequester !== cycle.requesterUserId
        ) {
          return {
            ok: false,
            effectiveRequesterId: null,
            reason: `Approval request requester (${validApprovalRequester}) does not match current-cycle history requester (${cycle.requesterUserId}) on payroll run ${payrollRunId}`,
          };
        }
        if (cycle.requesterUserIds.includes(decidedByUserId)) {
          return {
            ok: false,
            effectiveRequesterId: cycle.requesterUserId,
            reason: `Segregation of Duties violation on payroll run ${payrollRunId}: requester ${cycle.requesterUserId} cannot approve own run`,
          };
        }
        validHistoryRequester = cycle.requesterUserId;
      }
    }

    const effectiveRequesterId = validHistoryRequester ?? validApprovalRequester;
    if (!effectiveRequesterId) {
      return {
        ok: false,
        effectiveRequesterId: null,
        reason: `Missing requester identity on payroll run ${payrollRunId} — refusing approval under fail-closed Segregation of Duties`,
      };
    }

    if (
      effectiveRequesterId === decidedByUserId ||
      (validApprovalRequester && validApprovalRequester === decidedByUserId) ||
      (validHistoryRequester && validHistoryRequester === decidedByUserId)
    ) {
      return {
        ok: false,
        effectiveRequesterId,
        reason: `Segregation of Duties violation on payroll run ${payrollRunId}: requester ${effectiveRequesterId} cannot approve own run`,
      };
    }

    return { ok: true, effectiveRequesterId };
  }

  async handleApproval(params: {
    approvalRequestId: string;
    decidedByUserId: string | null;
    decidedAt: Date;
  }) {
    const { approvalRequestId, decidedByUserId } = params;
    const normalizedDeciderId =
      typeof decidedByUserId === "string" ? decidedByUserId.trim() : "";

    if (!normalizedDeciderId || normalizedDeciderId === "system") {
      this.logger.warn(
        `Approver identity is required for payroll approval ${approvalRequestId} — refusing approval`,
      );
      return;
    }

    const approvalReq = await this.findApprovalRequest(approvalRequestId);
    if (!approvalReq) return;

    const payrollRunId = (approvalReq.metadata as any)?.payrollRunId as string | undefined;
    if (!payrollRunId) {
      this.logger.warn(`No payrollRunId in metadata for approval ${approvalRequestId}`);
      return;
    }

    const existing = await this.db.query.payrollRuns.findFirst({
      where: eq(schema.payrollRuns.id, payrollRunId),
    });
    if (!existing) {
      this.logger.warn(`Payroll run ${payrollRunId} not found for approval`);
      return;
    }
    if (existing.status !== "pending_approval") {
      this.logger.warn(`Payroll run ${payrollRunId} status is ${existing.status} — not pending approval`);
      return;
    }

    const rawRequesterUserId = (
      approvalReq as { requestedByUserId?: string | null }
    ).requestedByUserId;
    const validApprovalRequester =
      typeof rawRequesterUserId === "string" &&
      rawRequesterUserId.trim().length > 0 &&
      rawRequesterUserId.trim() !== "system"
        ? rawRequesterUserId.trim()
        : null;

    const historyRows = await this.loadApprovalHistoryRows(this.db, payrollRunId);
    const preflightValidation = this.validateCycleAndSoD({
      payrollRunId,
      validApprovalRequester,
      historyRows,
      decidedByUserId: normalizedDeciderId,
    });
    if (!preflightValidation.ok) {
      this.logger.warn(preflightValidation.reason ?? `Refusing approval for ${payrollRunId}`);
      return;
    }

    if (isProvisionalPayrollRunRecord(existing).isProvisional) {
      this.logger.warn(
        `Payroll run ${payrollRunId} is marked provisional — refusing approval while HR/Finance policies remain unconfirmed`,
      );
      return;
    }

    if (!this.db.query?.payslips?.findMany) {
      this.logger.warn(
        `Payslip query unavailable for payroll run ${payrollRunId} — refusing approval fail-closed`,
      );
      return;
    }

    const runPayslips = await this.db.query.payslips.findMany({
      where: eq(schema.payslips.payrollRunId, payrollRunId),
    });
    if (runPayslips.length === 0) {
      this.logger.warn(`Payroll run ${payrollRunId} has no generated payslips — refusing approval`);
      return;
    }
    for (const payslip of runPayslips) {
      if (isProvisionalPayslipMetadata(payslip.metadata).isProvisional) {
        this.logger.warn(
          `Payroll run ${payrollRunId} contains provisional payslip ${payslip.id} — refusing approval while HR/Finance policies remain unconfirmed`,
        );
        return;
      }
    }

    let didTransitionRun = false;

    await this.db.transaction(async (tx) => {
      if (typeof (tx as any).execute === "function") {
        const lockedRows = await (tx as any).execute(sql`
          SELECT id, status
          FROM payroll_runs
          WHERE id = ${payrollRunId}
          FOR UPDATE
        `);
        const lockedRow = Array.isArray(lockedRows)
          ? lockedRows[0]
          : lockedRows?.rows?.[0];
        if (!lockedRow || lockedRow.status !== "pending_approval") {
          return;
        }
      }

      if ((tx as any).query?.payrollRuns?.findFirst) {
        const currentRun = await (tx as any).query.payrollRuns.findFirst({
          where: eq(schema.payrollRuns.id, payrollRunId),
        });
        if (
          !currentRun ||
          currentRun.status !== "pending_approval" ||
          isProvisionalPayrollRunRecord(currentRun).isProvisional
        ) {
          return;
        }
      }

      const txHistoryRows =
        (await this.loadApprovalHistoryRows(tx, payrollRunId)) ?? historyRows;
      const txValidation = this.validateCycleAndSoD({
        payrollRunId,
        validApprovalRequester,
        historyRows: txHistoryRows,
        decidedByUserId: normalizedDeciderId,
      });
      if (!txValidation.ok) {
        return;
      }

      if ((tx as any).query?.payslips?.findMany) {
        const txPayslips = await (tx as any).query.payslips.findMany({
          where: eq(schema.payslips.payrollRunId, payrollRunId),
        });
        if (
          txPayslips.length === 0 ||
          txPayslips.some((p: { metadata?: unknown }) => isProvisionalPayslipMetadata(p.metadata).isProvisional)
        ) {
          return;
        }
      }

      const updateQuery = tx
        .update(schema.payrollRuns)
        .set({
          status: "approved",
          approvedByUserId: normalizedDeciderId,
          approvedAt: new Date(),
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.payrollRuns.id, payrollRunId),
            eq(schema.payrollRuns.status, "pending_approval"),
          ),
        );

      let didTransition = true;
      if (typeof (updateQuery as any)?.returning === "function") {
        const updatedRows = await (updateQuery as any).returning({
          id: schema.payrollRuns.id,
        });
        didTransition = Array.isArray(updatedRows)
          ? updatedRows.length > 0
          : Boolean(updatedRows);
      } else {
        await updateQuery;
      }

      if (!didTransition) {
        return;
      }

      didTransitionRun = true;

      if (typeof (tx as any).insert === "function") {
        await tx.insert(schema.payrollRunApprovalHistory).values({
          payrollRunId,
          action: "APPROVED",
          performedByUserId: normalizedDeciderId,
          comment: "Approved via approval engine",
          createdAt: nextApprovalHistoryTimestamp(),
        });
      }
    });

    if (didTransitionRun) {
      this.logger.log(`Payroll run ${payrollRunId} approved by ${normalizedDeciderId}`);
    }
  }

  async handleRejection(params: {
    approvalRequestId: string;
    decidedByUserId: string | null;
    decidedAt: Date;
  }) {
    const { approvalRequestId, decidedByUserId } = params;
    const normalizedDeciderId =
      typeof decidedByUserId === "string" &&
      decidedByUserId.trim().length > 0 &&
      decidedByUserId.trim() !== "system"
        ? decidedByUserId.trim()
        : null;

    if (!normalizedDeciderId) {
      this.logger.warn(
        `Rejector identity is required for payroll rejection ${approvalRequestId} — refusing rejection`,
      );
      return;
    }

    const approvalReq = await this.findApprovalRequest(approvalRequestId);
    if (!approvalReq) return;

    const payrollRunId = (approvalReq.metadata as any)?.payrollRunId as string | undefined;
    if (!payrollRunId) {
      this.logger.warn(`No payrollRunId in metadata for approval ${approvalRequestId}`);
      return;
    }

    const existing = await this.db.query.payrollRuns.findFirst({
      where: eq(schema.payrollRuns.id, payrollRunId),
    });
    if (!existing) {
      this.logger.warn(`Payroll run ${payrollRunId} not found for rejection`);
      return;
    }
    if (existing.status !== "pending_approval") {
      this.logger.warn(`Payroll run ${payrollRunId} status is ${existing.status} — ignoring rejection`);
      return;
    }

    let didTransitionRun = false;

    await this.db.transaction(async (tx) => {
      if (typeof (tx as any).execute === "function") {
        const lockedRows = await (tx as any).execute(sql`
          SELECT id, status
          FROM payroll_runs
          WHERE id = ${payrollRunId}
          FOR UPDATE
        `);
        const lockedRow = Array.isArray(lockedRows)
          ? lockedRows[0]
          : lockedRows?.rows?.[0];
        if (!lockedRow || lockedRow.status !== "pending_approval") {
          return;
        }
      }

      const updateQuery = tx
        .update(schema.payrollRuns)
        .set({
          status: "draft",
          approvedByUserId: null,
          approvedAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.payrollRuns.id, payrollRunId),
            eq(schema.payrollRuns.status, "pending_approval"),
          ),
        );

      let didTransition = true;
      if (typeof (updateQuery as any)?.returning === "function") {
        const updatedRows = await (updateQuery as any).returning({
          id: schema.payrollRuns.id,
        });
        didTransition = Array.isArray(updatedRows)
          ? updatedRows.length > 0
          : Boolean(updatedRows);
      } else {
        await updateQuery;
      }

      if (!didTransition) {
        return;
      }

      didTransitionRun = true;

      if (typeof (tx as any).insert === "function") {
        await tx.insert(schema.payrollRunApprovalHistory).values({
          payrollRunId,
          action: "REJECTED",
          performedByUserId: normalizedDeciderId,
          comment: "Rejected via approval engine",
          createdAt: nextApprovalHistoryTimestamp(),
        });
      }
    });

    if (didTransitionRun) {
      this.logger.log(
        `Payroll run ${payrollRunId} returned to draft due to rejection by ${normalizedDeciderId}`,
      );
    }
  }

  private async findApprovalRequest(approvalRequestId: string) {
    return this.db.query.approvalRequests.findFirst({
      where: eq(schema.approvalRequests.id, approvalRequestId),
    });
  }
}
