import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import {
  employeeDocuments,
  employees,
  employmentRecords,
  orgAssignments,
  departments,
  files,
} from "../../../../infrastructure/database/schema";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { safeLimit, safePage } from "../../../../shared/dto/pagination.dto";
import { searchAny, combineWhere } from "../../../../shared/utils/where.util";
import { resolveSortOrder } from "../../../../shared/utils/sort.util";
import type { ListDocumentsQueryDto } from "../dto/documents.dto";

const DOCUMENT_SORT_FIELDS = {
  createdAt: employeeDocuments.createdAt,
  updatedAt: employeeDocuments.updatedAt,
  documentType: employeeDocuments.documentType,
  employeeName: sql`concat(${employees.lastName}, ' ', ${employees.firstName})`,
  employeeCode: employees.employeeCode,
  department: departments.name,
};

const DOCUMENT_SORT_ALIASES: Record<string, keyof typeof DOCUMENT_SORT_FIELDS> = {
  name: "employeeName",
};

export interface DocumentListRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string | null;
  departmentName: string | null;
  documentType: string;
  fileId: string;
  fileUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedDocuments {
  rows: DocumentListRow[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class DocumentQueryRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  async findPaginated(query: ListDocumentsQueryDto): Promise<PaginatedDocuments> {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const search = query.search?.trim() || undefined;
    const offset = (page - 1) * limit;

    const where: SQL[] = [isNull(employees.deletedAt)];

    if (query.employeeId) {
      where.push(eq(employeeDocuments.employeeId, query.employeeId));
    }

    if (query.departmentId) {
      where.push(eq(orgAssignments.departmentId, query.departmentId));
      where.push(eq(orgAssignments.isCurrent, true));
    }

    if (query.documentType) {
      where.push(eq(employeeDocuments.documentType, query.documentType));
    }

    if (query.isActive !== undefined) {
      where.push(eq(employeeDocuments.isActive, query.isActive));
    }

    const searchCondition = searchAny(
      search,
      employeeDocuments.documentType,
      employees.firstName,
      employees.lastName,
      employees.employeeCode,
    );

    const finalWhere = combineWhere(...where, searchCondition);

    // Total count
    const [totalRow] = await this.db
      .select({ count: count() })
      .from(employeeDocuments)
      .innerJoin(employees, eq(employeeDocuments.employeeId, employees.id))
      .leftJoin(
        orgAssignments,
        and(
          eq(orgAssignments.employeeId, employees.id),
          eq(orgAssignments.isCurrent, true),
        ),
      )
      .where(finalWhere);
    const total = Number(totalRow?.count ?? 0);

    // Fetch rows
    const rows = await this.db
      .select({
        id: employeeDocuments.id,
        employeeId: employeeDocuments.employeeId,
        employeeName: sql<string>`concat(${employees.lastName}, ' ', ${employees.firstName})`,
        employeeCode: employees.employeeCode,
        departmentName: departments.name,
        documentType: employeeDocuments.documentType,
        fileId: employeeDocuments.fileId,
        fileUrl: files.key,
        isActive: employeeDocuments.isActive,
        createdAt: employeeDocuments.createdAt,
        updatedAt: employeeDocuments.updatedAt,
      })
      .from(employeeDocuments)
      .innerJoin(employees, eq(employeeDocuments.employeeId, employees.id))
      .leftJoin(
        orgAssignments,
        and(
          eq(orgAssignments.employeeId, employees.id),
          eq(orgAssignments.isCurrent, true),
        ),
      )
      .leftJoin(departments, eq(departments.id, orgAssignments.departmentId))
      .leftJoin(files, eq(files.id, employeeDocuments.fileId))
      .where(finalWhere)
      .orderBy(
        ...resolveSortOrder({
          sort: query.sort,
          fields: DOCUMENT_SORT_FIELDS,
          defaultSort: [{ field: "createdAt", direction: "desc" }],
          aliasMap: DOCUMENT_SORT_ALIASES,
          tieBreaker: [asc(employeeDocuments.id)],
        }),
      )
      .limit(limit)
      .offset(offset);

    return { rows, total, page, limit };
  }

  async findById(id: string): Promise<DocumentListRow | null> {
    const [row] = await this.db
      .select({
        id: employeeDocuments.id,
        employeeId: employeeDocuments.employeeId,
        employeeName: sql<string>`concat(${employees.lastName}, ' ', ${employees.firstName})`,
        employeeCode: employees.employeeCode,
        departmentName: departments.name,
        documentType: employeeDocuments.documentType,
        fileId: employeeDocuments.fileId,
        fileUrl: files.key,
        isActive: employeeDocuments.isActive,
        createdAt: employeeDocuments.createdAt,
        updatedAt: employeeDocuments.updatedAt,
      })
      .from(employeeDocuments)
      .innerJoin(employees, eq(employeeDocuments.employeeId, employees.id))
      .leftJoin(
        orgAssignments,
        and(
          eq(orgAssignments.employeeId, employees.id),
          eq(orgAssignments.isCurrent, true),
        ),
      )
      .leftJoin(departments, eq(departments.id, orgAssignments.departmentId))
      .leftJoin(files, eq(files.id, employeeDocuments.fileId))
      .where(eq(employeeDocuments.id, id))
      .limit(1);

    return row ?? null;
  }
}
