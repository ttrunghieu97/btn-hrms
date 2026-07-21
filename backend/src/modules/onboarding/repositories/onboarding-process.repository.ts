import { Injectable, Inject } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import {
  boardingProcesses,
  boardingChecklistItems,
  boardingTemplates,
  boardingTemplateItems,
} from "../../../infrastructure/database/schema";
import type { AppDatabase } from "../../../infrastructure/database/database-client.type";

/* ─── Types ───────────────────────────────────────────────────── */

export interface CreateProcessRepoInput {
  employeeId: string;
  templateId: string;
  type: "onboarding" | "offboarding";
  status: "in_progress";
  startDate: string;
  targetEndDate: string | null;
  assignedHrUserId: string | null;
}

export interface CreateChecklistItemRepoInput {
  /** Omitted when passing to createProcessWithItems — the repo sets it. */
  processId?: string;
  title: string;
  dueDaysOffset: number;
  mandatory: boolean;
  templateItemId: string | null;
  assigneeUserId: string | null;
  dueDate: string | null;
  sortOrder: number;
}

export interface ProcessWithItems {
  id: string;
  employeeId: string;
  templateId: string | null;
  type: string;
  status: string;
  startDate: string;
  targetEndDate: string | null;
  assignedHrUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  checklistItems: {
    id: string;
    title: string;
    dueDaysOffset: number;
    mandatory: boolean;
    dueDate: string | null;
    isCompleted: boolean;
    completedAt: Date | null;
    completedByUserID: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

/* ─── Repository ──────────────────────────────────────────────── */

@Injectable()
export class OnboardingProcessRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  /** Check if an employee already has an active (non-terminal) process of given type. */
  async findActiveByEmployeeId(
    employeeId: string,
    type: "onboarding" | "offboarding" = "onboarding",
  ): Promise<{ id: string; status: string } | null> {
    const [row] = await this.db
      .select({ id: boardingProcesses.id, status: boardingProcesses.status })
      .from(boardingProcesses)
      .where(
        and(
          eq(boardingProcesses.employeeId, employeeId),
          eq(boardingProcesses.type, type),
          eq(boardingProcesses.status, "in_progress"),
          isNull(boardingProcesses.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  /** Create process + checklist items inside a single transaction. */
  async createProcessWithItems(
    process: CreateProcessRepoInput,
    items: CreateChecklistItemRepoInput[],
  ): Promise<ProcessWithItems> {
    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(boardingProcesses)
        .values({
          employeeId: process.employeeId,
          templateId: process.templateId,
          type: process.type,
          status: process.status,
          startDate: process.startDate,
          targetEndDate: process.targetEndDate ?? null,
          assignedHrUserId: process.assignedHrUserId ?? null,
        })
        .returning();

      if (!created) {
        throw new Error("Failed to create onboarding process");
      }

      const inserted = await tx
        .insert(boardingChecklistItems)
        .values(
          items.map((item) => ({
            processId: created.id,
            title: item.title,
            dueDaysOffset: item.dueDaysOffset,
            mandatory: item.mandatory,
            templateItemId: item.templateItemId ?? null,
            assigneeUserId: item.assigneeUserId ?? null,
            status: "pending" as const,
            dueDate: item.dueDate ?? null,
            isCompleted: false,
            completedAt: null,
            completedByUserID: null,
            notes: null,
          })),
        )
        .returning();

      return {
        id: created.id,
        employeeId: created.employeeId,
        templateId: created.templateId,
        type: created.type,
        status: created.status,
        startDate: created.startDate,
        targetEndDate: created.targetEndDate,
        assignedHrUserId: created.assignedHrUserId,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        checklistItems: inserted.map((ci) => ({
          id: ci.id,
          title: ci.title,
          dueDaysOffset: ci.dueDaysOffset,
          mandatory: ci.mandatory,
          dueDate: ci.dueDate,
          isCompleted: ci.isCompleted,
          completedAt: ci.completedAt,
          completedByUserID: ci.completedByUserID,
          createdAt: ci.createdAt,
          updatedAt: ci.updatedAt,
        })),
      };
    });
  }

  /** Fetch a template by ID and verify it is active. */
  async findActiveTemplate(
    id: string,
  ): Promise<{
    template: { id: string; name: string; type: string };
    items: {
      id: string;
      title: string;
      dueDaysOffset: number;
      isMandatory: boolean;
      assigneeType: string;
      defaultAssigneeUserId: string | null;
      sortOrder: number;
    }[];
  } | null> {
    const [template] = await this.db
      .select()
      .from(boardingTemplates)
      .where(
        and(
          eq(boardingTemplates.id, id),
          eq(boardingTemplates.isActive, true),
          isNull(boardingTemplates.deletedAt),
        ),
      )
      .limit(1);

    if (!template) return null;

    const items = await this.db
      .select()
      .from(boardingTemplateItems)
      .where(eq(boardingTemplateItems.templateId, id))
      .orderBy(boardingTemplateItems.sortOrder);

    return {
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
      },
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        dueDaysOffset: i.dueDaysOffset ?? 0,
        isMandatory: i.isMandatory,
        assigneeType: i.assigneeType,
        defaultAssigneeUserId: i.defaultAssigneeUserId,
        sortOrder: i.sortOrder,
      })),
    };
  }

  /** Fetch the active template for a given type. */
  async findActiveTemplateByType(
    type: "onboarding" | "offboarding",
  ): Promise<{
    template: { id: string; name: string; type: string };
    items: {
      id: string;
      title: string;
      dueDaysOffset: number;
      isMandatory: boolean;
      assigneeType: string;
      defaultAssigneeUserId: string | null;
      sortOrder: number;
    }[];
  } | null> {
    const [template] = await this.db
      .select()
      .from(boardingTemplates)
      .where(
        and(
          eq(boardingTemplates.type, type),
          eq(boardingTemplates.isActive, true),
          isNull(boardingTemplates.deletedAt),
        ),
      )
      .limit(1);

    if (!template) return null;

    const items = await this.db
      .select()
      .from(boardingTemplateItems)
      .where(eq(boardingTemplateItems.templateId, template.id))
      .orderBy(boardingTemplateItems.sortOrder);

    return {
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
      },
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        dueDaysOffset: i.dueDaysOffset ?? 0,
        isMandatory: i.isMandatory,
        assigneeType: i.assigneeType,
        defaultAssigneeUserId: i.defaultAssigneeUserId,
        sortOrder: i.sortOrder,
      })),
    };
  }

  /** List processes by type with pagination (summary). */
  async findByType(
    type: "onboarding" | "offboarding",
    page = 1,
    limit = 20,
  ): Promise<{ rows: { id: string; employeeId: string; status: string; startDate: string; completedAt: Date | null; createdAt: Date }[]; total: number }> {
    const offset = (page - 1) * limit;

    const [countResult] = await this.db
      .select({ count: sql`count(*)::int` })
      .from(boardingProcesses)
      .where(
        and(
          eq(boardingProcesses.type, type),
          isNull(boardingProcesses.deletedAt),
        ),
      );

    const rows = await this.db
      .select({
        id: boardingProcesses.id,
        employeeId: boardingProcesses.employeeId,
        status: boardingProcesses.status,
        startDate: boardingProcesses.startDate,
        completedAt: boardingProcesses.completedAt,
        createdAt: boardingProcesses.createdAt,
      })
      .from(boardingProcesses)
      .where(
        and(
          eq(boardingProcesses.type, type),
          isNull(boardingProcesses.deletedAt),
        ),
      )
      .orderBy(sql`${boardingProcesses.createdAt} desc`)
      .limit(limit)
      .offset(offset);

    return { rows, total: Number(countResult?.count ?? 0) };
  }

  /** Fetch a single process with checklist items by id. */
  async findByIdWithItems(
    id: string,
  ): Promise<{
    id: string;
    employeeId: string;
    templateId: string | null;
    type: string;
    status: string;
    startDate: string;
    targetEndDate: string | null;
    completedAt: Date | null;
    assignedHrUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    checklistItems: {
      id: string;
      title: string;
      dueDaysOffset: number;
      mandatory: boolean;
      status: string;
      dueDate: string | null;
      isCompleted: boolean;
      completedAt: Date | null;
      completedByUserID: string | null;
    }[];
  } | null> {
    const [process] = await this.db
      .select()
      .from(boardingProcesses)
      .where(
        and(
          eq(boardingProcesses.id, id),
          isNull(boardingProcesses.deletedAt),
        ),
      )
      .limit(1);

    if (!process) return null;

    const items = await this.db
      .select()
      .from(boardingChecklistItems)
      .where(eq(boardingChecklistItems.processId, id))
      .orderBy(boardingChecklistItems.createdAt);

    return {
      id: process.id,
      employeeId: process.employeeId,
      templateId: process.templateId,
      type: process.type,
      status: process.status,
      startDate: process.startDate,
      targetEndDate: process.targetEndDate,
      completedAt: process.completedAt,
      assignedHrUserId: process.assignedHrUserId,
      createdAt: process.createdAt,
      updatedAt: process.updatedAt,
      checklistItems: items.map((ci) => ({
        id: ci.id,
        title: ci.title,
        dueDaysOffset: ci.dueDaysOffset,
        mandatory: ci.mandatory,
        status: ci.status,
        dueDate: ci.dueDate,
        isCompleted: ci.isCompleted,
        completedAt: ci.completedAt,
        completedByUserID: ci.completedByUserID,
      })),
    };
  }
}
