import {  Inject , Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../database/database.provider";
import { AppDatabase } from "../database/database-client.type";
import * as schema from "../database/schema";

@Injectable()
export class SecurityRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  async findAuthUserById(userId: string) {
    const [row] = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        isSuperAdmin: schema.users.isSuperAdmin,
        isActive: schema.users.isActive,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    return row ?? null;
  }

  async isAuthUserActive(userId: string) {
    const user = await this.findAuthUserById(userId);
    return Boolean(user) && user!.isActive === true;
  }

  async findEmployeeContextByUserId(userId: string) {
    const [row] = await this.db
      .select({
        id: schema.employees.id,
        departmentId: schema.employees.departmentId,
      })
      .from(schema.employees)
      .where(eq(schema.employees.userId, userId))
      .limit(1);

    return row ?? null;
  }

  async loadAuthSession(userId: string) {
    const [row] = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        isSuperAdmin: schema.users.isSuperAdmin,
        isActive: schema.users.isActive,
        employeeId: schema.employees.id,
        departmentId: schema.employees.departmentId,
      })
      .from(schema.users)
      .leftJoin(
        schema.employees,
        and(eq(schema.employees.userId, schema.users.id), isNull(schema.employees.deletedAt)),
      )
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!row) return null;

    return {
      user: {
        id: row.id,
        username: row.username,
        isSuperAdmin: row.isSuperAdmin,
        isActive: row.isActive,
      },
      employee: row.employeeId
        ? { id: row.employeeId, departmentId: row.departmentId }
        : null,
    };
  }
}
