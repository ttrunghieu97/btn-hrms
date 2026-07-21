import { formatDateISO } from "@/shared/utils/date-format";
import type { EmployeeWithRelations, Tx } from "./employee-repository.types";
import { todayDateString } from "../../../../shared/utils/date-format";
import {
  departments,
  employeeContracts,
  employees,
  employmentRecords,
  orgAssignments,
  users,
  jobAssignments,
  employeeStatusHistory,
} from "../../../../infrastructure/database/schema";
import {
  and,
  asc,
  desc,
  count,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";
import { parseFields, parseInclude } from "../../../../shared/utils/query.util";
import type { EmployeeQueryDto } from "../dto/employee-query.dto";
import type { DataScope } from "../../../../core/security/types/data-scope.interface";
import { resolveSortOrder } from "../../../../shared/utils/sort.util";
import { combineWhere, searchAny } from "../../../../shared/utils/where.util";
import { safeLimit, safePage } from "../../../../shared/dto/pagination.dto";
import {
  EMPLOYEE_FIELDS,
  EMPLOYEE_RELATIONS,
  EMPLOYEE_SORT_ALIASES,
  EMPLOYEE_SORT_FIELDS,
  EmployeeQueryBuilder,
  UUID_RE,
} from "./employee-query-builder";
import { type EmployeeEncryption } from "./employee-encryption";

export class EmployeeReadRepository {
  constructor(
    private readonly db: Tx,
    private readonly encryption: EmployeeEncryption,
  ) {}

  async findById(id: string): Promise<any> {
    return this.findDetailedEmployee(eq(employees.id, id));
  }

  async findMany(options?: any) {
    return this.db.query.employees.findMany(options);
  }

  findManyRaw(
    options: Parameters<Tx["query"]["employees"]["findMany"]>[0],
  ) {
    return this.db.query.employees.findMany(options);
  }

  async count(where?: SQL) {
    const rows = await this.db
      .select({ count: count() })
      .from(employees)
      .where(where);
    return rows[0]?.count ?? 0;
  }

  async findPaginated(
    query: EmployeeQueryDto,
    scope?: DataScope,
  ): Promise<{
    rows: EmployeeWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const { fields, include, expiringSoon, expiryStatus } = query;
    const search = query.getNormalizedSearch();
    const departmentIds = query.getNormalizedDepartmentIds();
    const tabFilter = query.getTabFilter();
    const offset = (page - 1) * limit;

    const columns = parseFields(fields, "id", [...EMPLOYEE_FIELDS]);
    const withRelations = parseInclude(include, [...EMPLOYEE_RELATIONS]);

    const where: any[] = [
      query.includeDeleted
        ? isNotNull(employees.deletedAt)
        : isNull(employees.deletedAt),
    ];
    if (departmentIds?.length) {
      where.push(inArray(orgAssignments.departmentId, departmentIds));
      where.push(eq(orgAssignments.isCurrent, true));
    }

    if (scope) {
      if (scope.tier === "department" && scope.departmentId) {
        where.push(eq(orgAssignments.departmentId, scope.departmentId));
        where.push(eq(orgAssignments.isCurrent, true));
      } else if (scope.tier === "self" && scope.employeeId) {
        where.push(eq(employees.id, scope.employeeId));
      }
    }

    if (tabFilter) {
      if (tabFilter.contractStatus) {
        where.push(eq(employeeContracts.status, tabFilter.contractStatus as typeof employeeContracts.status._.data));
        where.push(eq(employeeContracts.isCurrent, true));
      }
      if (tabFilter.contractType) {
        where.push(eq(employeeContracts.contractType, tabFilter.contractType as typeof employeeContracts.contractType._.data));
      }
      if (tabFilter.employeeStatus) {
        where.push(eq(employees.status, tabFilter.employeeStatus as typeof employees.status._.data));
      }
    }

    if (expiryStatus || expiringSoon) {
      const today = todayDateString();
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      const nextMonthStr = formatDateISO(nextMonth);

      if (expiryStatus === "overdue") {
        where.push(sql`${employeeContracts.effectiveTo} < ${today}`);
        where.push(eq(employeeContracts.isCurrent, true));
      } else {
        where.push(
          and(
            sql`${employeeContracts.effectiveTo} >= ${today}`,
            sql`${employeeContracts.effectiveTo} <= ${nextMonthStr}`,
          ),
        );
        where.push(eq(employeeContracts.isCurrent, true));
      }
    }

    const finalWhere = combineWhere(
      ...where,
      searchAny(
        search,
        employees.firstName,
        employees.lastName,
        employees.employeeCode,
        employees.phoneNumber,
        users.username,
        users.email,
        departments.name,
      ),
    );
    const employeeIdRows = await this.db
      .select({ id: employees.id })
      .from(employees)
      .innerJoin(users, eq(employees.userId, users.id))
      .leftJoin(
        orgAssignments,
        and(
          eq(orgAssignments.employeeId, employees.id),
          eq(orgAssignments.isCurrent, true),
        ),
      )
      .leftJoin(
        employmentRecords,
        and(
          eq(employmentRecords.employeeId, employees.id),
          eq(employmentRecords.isCurrent, true),
        ),
      )
      .leftJoin(
        employeeContracts,
        and(
          eq(employeeContracts.employeeId, employees.id),
          eq(employeeContracts.isCurrent, true),
        ),
      )
      .leftJoin(departments, eq(departments.id, orgAssignments.departmentId))
      .where(finalWhere)
      .orderBy(
        ...resolveSortOrder({
          sort: query.sort,
          fields: EMPLOYEE_SORT_FIELDS,
          defaultSort: [
            { field: "createdAt", direction: "asc" },
          ],
          aliasMap: EMPLOYEE_SORT_ALIASES,
          tieBreaker: [asc(employees.id)],
        }),
      )
      .limit(limit)
      .offset(offset);

    if (!employeeIdRows.length) {
      return { rows: [], total: 0, page, limit };
    }

    const rows = await this.db.query.employees.findMany({
      columns,
      where: inArray(
        employees.id,
        employeeIdRows.map((row) => row.id),
      ),
      with: EmployeeQueryBuilder.buildEmployeeWithRelations(withRelations),
    });

    const [totalRow] = await this.db
      .select({ count: sql<number>`count(distinct ${employees.id})` })
      .from(employees)
      .innerJoin(users, eq(employees.userId, users.id))
      .leftJoin(
        orgAssignments,
        and(
          eq(orgAssignments.employeeId, employees.id),
          eq(orgAssignments.isCurrent, true),
        ),
      )
      .leftJoin(
        employmentRecords,
        and(
          eq(employmentRecords.employeeId, employees.id),
          eq(employmentRecords.isCurrent, true),
        ),
      )
      .leftJoin(
        employeeContracts,
        and(
          eq(employeeContracts.employeeId, employees.id),
          eq(employeeContracts.isCurrent, true),
        ),
      )
      .leftJoin(departments, eq(departments.id, orgAssignments.departmentId))
      .where(finalWhere);

    const orderedRows = employeeIdRows
      .map((item) => rows.find((row) => row.id === item.id))
      .filter(
        (row): row is NonNullable<typeof row> => Boolean(row),
      ) as EmployeeWithRelations[];

    const decryptedRows = this.encryption
      ? orderedRows.map((row) => this.encryption.decryptPiiFields(row))
      : orderedRows;

    return {
      rows: decryptedRows,
      total: Number(totalRow?.count ?? 0),
      page,
      limit,
    };
  }

  async findByIdentifier(identifier: string, query?: EmployeeQueryDto) {
    const columns = parseFields(query?.fields, "id", [...EMPLOYEE_FIELDS]);
    const withRelations = parseInclude(query?.include, [...EMPLOYEE_RELATIONS]);

    let whereClause;
    if (UUID_RE.test(identifier)) {
      whereClause = eq(employees.id, identifier);
    } else {
      const userFound = await this.findUserIdByUsername(identifier);
      if (!userFound) return null;
      whereClause = eq(employees.userId, userFound.id);
    }

    const row = await this.db.query.employees.findFirst({
      columns,
      where: whereClause,
      with: EmployeeQueryBuilder.buildEmployeeWithRelations(withRelations),
    });
    return this.encryption ? this.encryption.decryptPiiFields(row) : row;
  }

  findUserIdByUsername(username: string, db: Tx = this.db) {
    return db.query.users.findFirst({
      where: eq(users.username, username),
      columns: { id: true },
    });
  }

  findUserIdByUserId(userId: string, db: Tx = this.db) {
    return db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, username: true },
    });
  }

  findFirstEmployee(
    options: Parameters<Tx["query"]["employees"]["findFirst"]>[0],
  ) {
    return this.db.query.employees.findFirst(options);
  }

  async findEmployeeByUserId(userId: string) {
    const row = await this.db
      .select()
      .from(employees)
      .where(
        and(eq(employees.userId, userId), isNull(employees.deletedAt)),
      )
      .limit(1)
      .then((r) => r[0] ?? null);
    return this.encryption ? this.encryption.decryptPiiFields(row) : row;
  }

  async findEmployeeById(employeeId: string) {
    const row = await this.db
      .select()
      .from(employees)
      .where(
        and(eq(employees.id, employeeId), isNull(employees.deletedAt)),
      )
      .limit(1)
      .then((r) => r[0] ?? null);
    return this.encryption ? this.encryption.decryptPiiFields(row) : row;
  }

  async findDeletedEmployeeByUserId(userId: string) {
    const row = await this.db
      .select()
      .from(employees)
      .where(
        and(eq(employees.userId, userId), isNotNull(employees.deletedAt)),
      )
      .limit(1)
      .then((r) => r[0] ?? null);
    return this.encryption ? this.encryption.decryptPiiFields(row) : row;
  }

  async findDeletedEmployeeById(employeeId: string) {
    const row = await this.db
      .select()
      .from(employees)
      .where(
        and(eq(employees.id, employeeId), isNotNull(employees.deletedAt)),
      )
      .limit(1)
      .then((r) => r[0] ?? null);
    return this.encryption ? this.encryption.decryptPiiFields(row) : row;
  }

  findCurrentEmploymentRecord(employeeId: string, db: Tx = this.db) {
    return db.query.employmentRecords.findFirst({
      where: and(
        eq(employmentRecords.employeeId, employeeId),
        eq(employmentRecords.isCurrent, true),
      ),
    });
  }

  findCurrentEmployeeContract(employeeId: string, db: Tx = this.db) {
    return db.query.employeeContracts.findFirst({
      where: and(
        eq(employeeContracts.employeeId, employeeId),
        eq(employeeContracts.isCurrent, true),
      ),
    });
  }

  findCurrentOrgAssignment(employeeId: string, db: Tx = this.db) {
    return db.query.orgAssignments.findFirst({
      where: and(
        eq(orgAssignments.employeeId, employeeId),
        eq(orgAssignments.isCurrent, true),
      ),
    });
  }

  async findEmployeeUserContextByIdentifier(
    identifier: string,
    db: Tx = this.db,
  ) {
    const whereClause = UUID_RE.test(identifier)
      ? eq(employees.id, identifier)
      : eq(users.username, identifier);

    const [row] = await db
      .select({
        employeeId: employees.id,
        userId: employees.userId,
        username: users.username,
      })
      .from(employees)
      .innerJoin(users, eq(employees.userId, users.id))
      .where(whereClause)
      .limit(1);
    return row ?? null;
  }

  async userExistsByUsername(username: string) {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return !!row;
  }

  async checkCodeExists(employeeCode: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.employeeCode, employeeCode))
      .limit(1);
    return !!row;
  }

  private async findDetailedEmployee(whereClause: SQL): Promise<any> {
    const row = await this.db.query.employees.findFirst({
      where: and(whereClause, isNull(employees.deletedAt)),
      with: EmployeeQueryBuilder.buildEmployeeWithRelations(),
    });
    return this.encryption ? this.encryption.decryptPiiFields(row) : row;
  }

  async countActiveByPositions() {
    const rows = await this.db
      .select({
        positionId: jobAssignments.positionId,
        count: count(employees.id),
      })
      .from(employees)
      .innerJoin(
        jobAssignments,
        and(
          eq(employees.id, jobAssignments.employeeId),
          sql`${jobAssignments.deletedAt} is null`,
        ),
      )
      .where(
        and(
          isNull(employees.deletedAt),
          sql`${employees.status} = 'working'`,
        ),
      )
      .groupBy(jobAssignments.positionId);

    const result: Record<string, number> = {};
    for (const r of rows) {
      if (r.positionId) {
        result[r.positionId] = r.count;
      }
    }
    return result;
  }

  async countActiveByDepartments() {
    const rows = await this.db
      .select({
        departmentId: orgAssignments.departmentId,
        count: count(employees.id),
      })
      .from(employees)
      .innerJoin(
        orgAssignments,
        and(
          eq(employees.id, orgAssignments.employeeId),
          eq(orgAssignments.isCurrent, true),
        ),
      )
      .where(
        and(
          isNull(employees.deletedAt),
          sql`${employees.status} = 'working'`,
        ),
      )
      .groupBy(orgAssignments.departmentId);

    const result: Record<string, number> = {};
    for (const r of rows) {
      if (r.departmentId) {
        result[r.departmentId] = r.count;
      }
    }
    return result;
  }

  async listStatusHistory(employeeId: string, limit = 50) {
    return this.db
      .select({
        id: employeeStatusHistory.id,
        status: employeeStatusHistory.status,
        notes: employeeStatusHistory.notes,
        changedAt: employeeStatusHistory.changedAt,
        changedBy: employeeStatusHistory.changedBy,
      })
      .from(employeeStatusHistory)
      .where(eq(employeeStatusHistory.employeeId, employeeId))
      .orderBy(desc(employeeStatusHistory.changedAt))
      .limit(limit);
  }
}
