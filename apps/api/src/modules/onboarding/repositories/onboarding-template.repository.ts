import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, eq, isNull, sql, type SQL } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import {
  boardingTemplates,
  boardingTemplateItems,
  departments,
} from "../../../infrastructure/database/schema";
import type { AppDatabase } from "../../../infrastructure/database/database-client.type";
import { safeLimit, safePage } from "../../../shared/dto/pagination.dto";
import { searchAny, combineWhere } from "../../../shared/utils/where.util";
import { resolveSortOrder } from "../../../shared/utils/sort.util";
import type {
  ListOnboardingTemplatesQueryDto,
  CreateOnboardingTemplateDto,
  UpdateOnboardingTemplateDto,
  OnboardingTemplateItemDto,
} from "../dto/onboarding-template.dto";
import type {
  OnboardingTemplateResponseDto,
  OnboardingTemplateItemResponseDto,
} from "../dto/onboarding-template-response.dto";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface TemplateListItem {
  id: string;
  name: string;
  type: string;
  departmentName: string | null;
  isDefault: boolean;
  isActive: boolean;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedTemplates {
  rows: TemplateListItem[];
  total: number;
  page: number;
  limit: number;
}

type TemplateWithItems = OnboardingTemplateResponseDto;

/* ------------------------------------------------------------------ */
/* Sort config                                                         */
/* ------------------------------------------------------------------ */

const SORT_FIELDS = {
  name: boardingTemplates.name,
  type: boardingTemplates.type,
  createdAt: boardingTemplates.createdAt,
  updatedAt: boardingTemplates.updatedAt,
  isActive: boardingTemplates.isActive,
};

/* ------------------------------------------------------------------ */
/* Repository                                                          */
/* ------------------------------------------------------------------ */

@Injectable()
export class OnboardingTemplateRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  /* ---------- Paginated list ---------- */

  async findPaginated(query: ListOnboardingTemplatesQueryDto): Promise<PaginatedTemplates> {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const search = query.search?.trim() || undefined;
    const offset = (page - 1) * limit;

    const where: SQL[] = [isNull(boardingTemplates.deletedAt)];

    if (query.type) where.push(eq(boardingTemplates.type, query.type as any));
    if (query.departmentId) where.push(eq(boardingTemplates.departmentId, query.departmentId));
    if (query.isActive !== undefined) where.push(eq(boardingTemplates.isActive, query.isActive));

    const searchCondition = searchAny(search, boardingTemplates.name);
    const finalWhere = combineWhere(...where, searchCondition);

    // Total
    const [totalRow] = await this.db
      .select({ count: count() })
      .from(boardingTemplates)
      .where(finalWhere);
    const total = Number(totalRow?.count ?? 0);

    // Rows
    const rows = await this.db
      .select({
        id: boardingTemplates.id,
        name: boardingTemplates.name,
        type: boardingTemplates.type,
        departmentName: departments.name,
        isDefault: boardingTemplates.isDefault,
        isActive: boardingTemplates.isActive,
        itemCount: sql<number>`count(${boardingTemplateItems.id})::int`,
        createdAt: boardingTemplates.createdAt,
        updatedAt: boardingTemplates.updatedAt,
      })
      .from(boardingTemplates)
      .leftJoin(
        boardingTemplateItems,
        eq(boardingTemplateItems.templateId, boardingTemplates.id),
      )
      .leftJoin(departments, eq(departments.id, boardingTemplates.departmentId))
      .where(finalWhere)
      .groupBy(boardingTemplates.id, departments.name)
      .orderBy(
        ...resolveSortOrder({
          sort: query.sort,
          fields: SORT_FIELDS,
          defaultSort: [{ field: "createdAt", direction: "desc" }],
          tieBreaker: [asc(boardingTemplates.id)],
        }),
      )
      .limit(limit)
      .offset(offset);

    return { rows, total, page, limit };
  }

  /* ---------- Detail with items ---------- */

  async findByIdWithItems(id: string): Promise<TemplateWithItems | null> {
    const [template] = await this.db
      .select()
      .from(boardingTemplates)
      .where(eq(boardingTemplates.id, id))
      .limit(1);
    if (!template) return null;

    const items = await this.db
      .select()
      .from(boardingTemplateItems)
      .where(eq(boardingTemplateItems.templateId, id))
      .orderBy(asc(boardingTemplateItems.sortOrder), asc(boardingTemplateItems.createdAt));

    return {
      id: template.id,
      name: template.name,
      type: template.type,
      departmentId: template.departmentId,
      positionId: template.positionId,
      isDefault: template.isDefault,
      isActive: template.isActive,
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        assigneeType: item.assigneeType,
        assigneeUserId: item.defaultAssigneeUserId,
        dueDaysOffset: item.dueDaysOffset ?? 0,
        isMandatory: item.isMandatory,
        sortOrder: item.sortOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /* ---------- Create ---------- */

  async create(data: CreateOnboardingTemplateDto): Promise<TemplateWithItems> {
    return this.db.transaction(async (tx) => {
      const [template] = await tx
        .insert(boardingTemplates)
        .values({
          name: data.name,
          type: data.type as any,
          departmentId: data.departmentId ?? null,
          positionId: data.positionId ?? null,
          isDefault: data.isDefault ?? false,
          isActive: data.isActive ?? true,
        })
        .returning();
      if (!template) throw new Error("Failed to create onboarding template");

      const itemsData = data.items.map((item, idx) => ({
        templateId: template.id,
        title: item.title,
        description: item.description ?? null,
        category: item.category ?? null,
        assigneeType: item.assigneeType as any,
        defaultAssigneeUserId: item.assigneeUserId ?? null,
        dueDaysOffset: item.dueDaysOffset ?? 0,
        isMandatory: item.isMandatory ?? true,
        sortOrder: idx * 10,
      }));

      const items = await tx
        .insert(boardingTemplateItems)
        .values(itemsData)
        .returning();

      return {
        id: template.id,
        name: template.name,
        type: template.type,
        departmentId: template.departmentId,
        positionId: template.positionId,
        isDefault: template.isDefault,
        isActive: template.isActive,
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          assigneeType: item.assigneeType,
          assigneeUserId: item.defaultAssigneeUserId,
          dueDaysOffset: item.dueDaysOffset ?? 0,
          isMandatory: item.isMandatory,
          sortOrder: item.sortOrder,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
    });
  }

  /* ---------- Update ---------- */

  async update(id: string, data: UpdateOnboardingTemplateDto): Promise<TemplateWithItems | null> {
    const existing = await this.findByIdWithItems(id);
    if (!existing) return null;

    return this.db.transaction(async (tx) => {
      const patch: Record<string, unknown> = {};
      if (data.name !== undefined) patch.name = data.name;
      if (data.type !== undefined) patch.type = data.type;
      if (data.departmentId !== undefined) patch.departmentId = data.departmentId;
      if (data.positionId !== undefined) patch.positionId = data.positionId;
      if (data.isDefault !== undefined) patch.isDefault = data.isDefault;
      if (data.isActive !== undefined) patch.isActive = data.isActive;

      const [updated] = await tx
        .update(boardingTemplates)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(boardingTemplates.id, id))
        .returning();
      if (!updated) return null;

      // Replace items if provided
      if (data.items !== undefined) {
        await tx
          .delete(boardingTemplateItems)
          .where(eq(boardingTemplateItems.templateId, id));

        if (data.items.length > 0) {
          const itemsData = data.items.map((item, idx) => ({
            templateId: id,
            title: item.title,
            description: item.description ?? null,
            category: item.category ?? null,
            assigneeType: item.assigneeType as any,
            defaultAssigneeUserId: item.assigneeUserId ?? null,
            dueDaysOffset: item.dueDaysOffset ?? 0,
            isMandatory: item.isMandatory ?? true,
            sortOrder: idx * 10,
          }));

          await tx.insert(boardingTemplateItems).values(itemsData);
        }
      }

      // Re-fetch to return full aggregate
      const result = await this.findByIdWithItems(id);
      return result;
    });
  }

  /* ---------- Soft delete ---------- */

  async softDelete(id: string): Promise<boolean> {
    const [row] = await this.db
      .update(boardingTemplates)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(and(eq(boardingTemplates.id, id), isNull(boardingTemplates.deletedAt)))
      .returning({ id: boardingTemplates.id });
    return !!row;
  }
}
