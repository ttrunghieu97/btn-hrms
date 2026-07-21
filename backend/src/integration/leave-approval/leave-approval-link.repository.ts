import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "@/infrastructure/database/database.tokens";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";
import * as schema from "@/infrastructure/database/schema";
import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import type { leaveApprovalLinks as leaveApprovalLinksTable } from "@/infrastructure/database/schema/leave-approval/tables";

type LinkStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveApprovalLink = InferSelectModel<typeof leaveApprovalLinksTable>;

@Injectable()
export class LeaveApprovalLinkRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
  ) {}

  async create(input: {
    leaveRequestId: string;
    approvalRequestId: string;
    policyId: string | null;
    status?: LinkStatus;
  }): Promise<LeaveApprovalLink> {
    const [row] = await this.db
      .insert(schema.leaveApprovalLinks)
      .values({
        leaveRequestId: input.leaveRequestId,
        approvalRequestId: input.approvalRequestId,
        policyId: input.policyId ?? null,
        status: input.status ?? "pending",
      })
      .returning();
    if (!row) throw new Error("Failed to create leave approval link");
    return row;
  }

  async findByLeaveRequestId(
    leaveRequestId: string,
  ): Promise<LeaveApprovalLink | null> {
    const row = await this.db.query.leaveApprovalLinks.findFirst({
      where: eq(schema.leaveApprovalLinks.leaveRequestId, leaveRequestId),
    });
    return row ?? null;
  }

  async findByApprovalRequestId(
    approvalRequestId: string,
  ): Promise<LeaveApprovalLink | null> {
    const row = await this.db.query.leaveApprovalLinks.findFirst({
      where: eq(schema.leaveApprovalLinks.approvalRequestId, approvalRequestId),
    });
    return row ?? null;
  }

  async updateStatus(
    leaveRequestId: string,
    status: LinkStatus,
  ): Promise<void> {
    await this.db
      .update(schema.leaveApprovalLinks)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.leaveApprovalLinks.leaveRequestId, leaveRequestId));
  }

  async transaction<T>(
    callback: (tx: AppDatabase) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(callback);
  }
}
