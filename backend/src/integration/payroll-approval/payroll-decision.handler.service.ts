import { Injectable, Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "@/infrastructure/database/database.tokens";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";
import * as schema from "@/infrastructure/database/schema";
import { eq } from "drizzle-orm";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";

@Injectable()
export class PayrollDecisionHandler {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, PayrollDecisionHandler.name);
  }

  async handleApproval(params: {
    approvalRequestId: string;
    decidedByUserId: string | null;
    decidedAt: Date;
  }) {
    const { approvalRequestId, decidedByUserId } = params;

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

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.payrollRuns)
        .set({
          status: "approved",
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.payrollRuns.id, payrollRunId));
    });

    this.logger.log(`Payroll run ${payrollRunId} approved by ${decidedByUserId}`);
  }

  async handleRejection(params: {
    approvalRequestId: string;
    decidedByUserId: string | null;
    decidedAt: Date;
  }) {
    const { approvalRequestId, decidedByUserId } = params;

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

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.payrollRuns)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(schema.payrollRuns.id, payrollRunId));
    });

    this.logger.log(`Payroll run ${payrollRunId} cancelled due to rejection by ${decidedByUserId}`);
  }

  private async findApprovalRequest(approvalRequestId: string) {
    return this.db.query.approvalRequests.findFirst({
      where: eq(schema.approvalRequests.id, approvalRequestId),
    });
  }
}
