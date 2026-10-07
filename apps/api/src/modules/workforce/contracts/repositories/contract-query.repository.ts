import { formatDateISO } from "@/shared/utils/date-format";
import { Inject, Injectable } from "@nestjs/common";
import { todayDateString } from "../../../../shared/utils/date-format";
import { and, asc, desc, count, eq, gte, inArray, isNull, lte, sql, type SQL } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import {
  employeeContracts,
  employees,
  employmentRecords,
  orgAssignments,
  departments,
} from "../../../../infrastructure/database/schema";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { safeLimit, safePage } from "../../../../shared/dto/pagination.dto";
import { searchAny, combineWhere } from "../../../../shared/utils/where.util";
import { resolveSortOrder } from "../../../../shared/utils/sort.util";
import type { ListContractsQueryDto } from "../dto/contracts.dto";

/**
 * Returns YYYY-MM-DD for a given Date in APP_TIMEZONE.
 * Used locally for timezone-safe date string from a Date object.
 */
function todayDateString_fromDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE ?? "Asia/Ho_Chi_Minh",
  }).format(date);
}



const CONTRACT_SORT_FIELDS = {
  effectiveFrom: employeeContracts.effectiveFrom,
  effectiveTo: employeeContracts.effectiveTo,
  createdAt: employeeContracts.createdAt,
  updatedAt: employeeContracts.updatedAt,
  contractType: employeeContracts.contractType,
  status: employeeContracts.status,
  employeeName: sql`concat(${employees.lastName}, ' ', ${employees.firstName})`,
  employeeCode: employees.employeeCode,
  department: departments.name,
};

const CONTRACT_SORT_ALIASES: Record<string, keyof typeof CONTRACT_SORT_FIELDS> = {
  name: "employeeName",
};

export interface ContractListRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string | null;
  departmentName: string | null;
  contractNumber: string | null;
  contractType: string;
  status: string;
  version: number;
  signedAt: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  fileUrl: string | null;
  note: string | null;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedContracts {
  rows: ContractListRow[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ContractQueryRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  async findPaginated(query: ListContractsQueryDto): Promise<PaginatedContracts> {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const search = query.search?.trim() || undefined;
    const offset = (page - 1) * limit;

    const where: SQL[] = [isNull(employees.deletedAt)];

    // employeeId filter
    if (query.employeeId) {
      where.push(eq(employeeContracts.employeeId, query.employeeId));
    }

    // departmentId filter — joins through orgAssignments
    if (query.departmentId) {
      where.push(eq(orgAssignments.departmentId, query.departmentId));
      where.push(eq(orgAssignments.isCurrent, true));
    }

    // contractType filter
    if (query.contractType) {
      where.push(eq(employeeContracts.contractType, query.contractType as any));
    }

    // status filter
    if (query.status) {
      where.push(eq(employeeContracts.status, query.status as any));
    }

    // expiresWithin — filter contracts where effectiveTo is within next N days
    if (query.expiresWithin) {
      const today = todayDateString();
      const future = new Date();
      future.setDate(future.getDate() + query.expiresWithin);
      const futureStr = todayDateString_fromDate(future);
      where.push(
        and(
          gte(employeeContracts.effectiveTo, today),
          lte(employeeContracts.effectiveTo, futureStr),
        )!,
      );
      where.push(eq(employeeContracts.isCurrent, true));
    }

    // search — across employee name, code, contract number
    const searchCondition = searchAny(
      search,
      employees.firstName,
      employees.lastName,
      employees.employeeCode,
      employeeContracts.contractNumber,
    );

    const finalWhere = combineWhere(...where, searchCondition);

    // Shared join chain
    const queryBuilder = (select: any) =>
      select
        .from(employeeContracts)
        .innerJoin(employees, eq(employeeContracts.employeeId, employees.id))
        .leftJoin(
          orgAssignments,
          and(
            eq(orgAssignments.employeeId, employees.id),
            eq(orgAssignments.isCurrent, true),
          ),
        )
        .leftJoin(departments, eq(departments.id, orgAssignments.departmentId))
        .where(finalWhere);

    // Total count
    const [totalRow] = await queryBuilder(
      this.db.select({ count: count() }),
    );
    const total = Number(totalRow?.count ?? 0);

    // Fetch rows
    const rows = await queryBuilder(
      this.db.select({
        id: employeeContracts.id,
        employeeId: employeeContracts.employeeId,
        employeeName: sql<string>`concat(${employees.lastName}, ' ', ${employees.firstName})`,
        employeeCode: employees.employeeCode,
        departmentName: departments.name,
        contractNumber: employeeContracts.contractNumber,
        contractType: employeeContracts.contractType,
        status: employeeContracts.status,
        version: employeeContracts.version,
        signedAt: employeeContracts.signedAt,
        effectiveFrom: employeeContracts.effectiveFrom,
        effectiveTo: employeeContracts.effectiveTo,
        fileUrl: employeeContracts.fileUrl,
        note: employeeContracts.note,
        isCurrent: employeeContracts.isCurrent,
        createdAt: employeeContracts.createdAt,
        updatedAt: employeeContracts.updatedAt,
      }),
    )
      .orderBy(
        ...resolveSortOrder({
          sort: query.sort,
          fields: CONTRACT_SORT_FIELDS,
          defaultSort: [
            { field: "effectiveFrom", direction: "desc" },
          ],
          aliasMap: CONTRACT_SORT_ALIASES,
          tieBreaker: [asc(employeeContracts.id)],
        }),
      )
      .limit(limit)
      .offset(offset);

    return { rows, total, page, limit };
  }

  async findById(id: string): Promise<ContractListRow | null> {
    const [row] = await this.db
      .select({
        id: employeeContracts.id,
        employeeId: employeeContracts.employeeId,
        employeeName: sql<string>`concat(${employees.lastName}, ' ', ${employees.firstName})`,
        employeeCode: employees.employeeCode,
        departmentName: departments.name,
        contractNumber: employeeContracts.contractNumber,
        contractType: employeeContracts.contractType,
        status: employeeContracts.status,
        version: employeeContracts.version,
        signedAt: employeeContracts.signedAt,
        effectiveFrom: employeeContracts.effectiveFrom,
        effectiveTo: employeeContracts.effectiveTo,
        fileUrl: employeeContracts.fileUrl,
        note: employeeContracts.note,
        isCurrent: employeeContracts.isCurrent,
        createdAt: employeeContracts.createdAt,
        updatedAt: employeeContracts.updatedAt,
      })
      .from(employeeContracts)
      .innerJoin(employees, eq(employeeContracts.employeeId, employees.id))
      .leftJoin(
        orgAssignments,
        and(
          eq(orgAssignments.employeeId, employees.id),
          eq(orgAssignments.isCurrent, true),
        ),
      )
      .leftJoin(departments, eq(departments.id, orgAssignments.departmentId))
      .where(eq(employeeContracts.id, id))
      .limit(1);

    return row ?? null;
  }

  async findHistory(contractId: string) {
    // First get the contract to know its employee
    const contract = await this.findById(contractId);
    if (!contract) return null;

    // Fetch all contracts for this employee ordered by version
    return this.db
      .select({
        id: employeeContracts.id,
        version: employeeContracts.version,
        previousContractId: employeeContracts.previousContractId,
        contractType: employeeContracts.contractType,
        status: employeeContracts.status,
        effectiveFrom: employeeContracts.effectiveFrom,
        effectiveTo: employeeContracts.effectiveTo,
        signedAt: employeeContracts.signedAt,
        contractNumber: employeeContracts.contractNumber,
        isCurrent: employeeContracts.isCurrent,
        createdAt: employeeContracts.createdAt,
        updatedAt: employeeContracts.updatedAt,
      })
      .from(employeeContracts)
      .where(eq(employeeContracts.employeeId, contract.employeeId))
      .orderBy(desc(employeeContracts.version));
  }
}
