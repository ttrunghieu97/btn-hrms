import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "@/infrastructure/database/database.tokens";
import type { AppDatabase } from "@/infrastructure/database/database-client.type";
import * as schema from "@/infrastructure/database/schema";
import { and, eq, type InferSelectModel } from "drizzle-orm";
import type { recruitmentApprovalLinks as recruitmentApprovalLinksTable } from "@/infrastructure/database/schema/recruitment-approval/tables";

export type RecruitmentApprovalSubject = "requisition" | "offer";
type LinkStatus = "pending" | "approved" | "rejected" | "cancelled";
export type RecruitmentApprovalLink = InferSelectModel<
  typeof recruitmentApprovalLinksTable
>;

@Injectable()
export class RecruitmentApprovalLinkRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
  ) {}

  async create(input: {
    subjectType: RecruitmentApprovalSubject;
    subjectId: string;
    approvalRequestId: string;
    policyId: string | null;
    status?: LinkStatus;
  }): Promise<RecruitmentApprovalLink> {
    const [row] = await this.db
      .insert(schema.recruitmentApprovalLinks)
      .values({
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        approvalRequestId: input.approvalRequestId,
        policyId: input.policyId ?? null,
        status: input.status ?? "pending",
      })
      .returning();
    if (!row) throw new Error("Failed to create recruitment approval link");
    return row;
  }

  async findBySubject(
    subjectType: RecruitmentApprovalSubject,
    subjectId: string,
  ): Promise<RecruitmentApprovalLink | null> {
    const row = await this.db.query.recruitmentApprovalLinks.findFirst({
      where: and(
        eq(schema.recruitmentApprovalLinks.subjectType, subjectType),
        eq(schema.recruitmentApprovalLinks.subjectId, subjectId),
      ),
    });
    return row ?? null;
  }

  async findByApprovalRequestId(
    approvalRequestId: string,
  ): Promise<RecruitmentApprovalLink | null> {
    const row = await this.db.query.recruitmentApprovalLinks.findFirst({
      where: eq(
        schema.recruitmentApprovalLinks.approvalRequestId,
        approvalRequestId,
      ),
    });
    return row ?? null;
  }

  async updateStatus(
    approvalRequestId: string,
    status: LinkStatus,
  ): Promise<void> {
    await this.db
      .update(schema.recruitmentApprovalLinks)
      .set({ status, updatedAt: new Date() })
      .where(
        eq(
          schema.recruitmentApprovalLinks.approvalRequestId,
          approvalRequestId,
        ),
      );
  }
}
