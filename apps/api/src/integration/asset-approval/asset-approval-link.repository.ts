import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "@/infrastructure/database/database.tokens";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";
import * as schema from "@/infrastructure/database/schema";
import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import type { assetApprovalLinks as assetApprovalLinksTable } from "@/infrastructure/database/schema/asset-approval/tables";

export type AssetApprovalSubject = "request";
type LinkStatus = "pending" | "approved" | "rejected" | "cancelled";
export type AssetApprovalLink = InferSelectModel<typeof assetApprovalLinksTable>;

@Injectable()
export class AssetApprovalLinkRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  async create(input: {
    subjectType: AssetApprovalSubject;
    subjectId: string;
    approvalRequestId: string;
    policyId: string | null;
    status?: LinkStatus;
  }): Promise<AssetApprovalLink> {
    const [row] = await this.db
      .insert(schema.assetApprovalLinks)
      .values({
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        approvalRequestId: input.approvalRequestId,
        policyId: input.policyId ?? null,
        status: input.status ?? "pending",
      })
      .returning();
    if (!row) throw new Error("Failed to create asset approval link");
    return row;
  }

  async findBySubject(
    subjectType: AssetApprovalSubject,
    subjectId: string,
  ): Promise<AssetApprovalLink | null> {
    const row = await this.db.query.assetApprovalLinks.findFirst({
      where: (t, { and, eq: eqFn }) =>
        and(eqFn(t.subjectType, subjectType), eqFn(t.subjectId, subjectId)),
    });
    return row ?? null;
  }

  async findByApprovalRequestId(
    approvalRequestId: string,
  ): Promise<AssetApprovalLink | null> {
    const row = await this.db.query.assetApprovalLinks.findFirst({
      where: eq(schema.assetApprovalLinks.approvalRequestId, approvalRequestId),
    });
    return row ?? null;
  }

  async updateStatus(
    approvalRequestId: string,
    status: LinkStatus,
  ): Promise<void> {
    await this.db
      .update(schema.assetApprovalLinks)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.assetApprovalLinks.approvalRequestId, approvalRequestId));
  }
}
