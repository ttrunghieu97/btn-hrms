import {  Inject , Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../infrastructure/database/database-client.type";
import * as schema from "../../../infrastructure/database/schema";
import { AuthzAuditEntry } from "./authorization-audit.service";

@Injectable()
export class AuthorizationAuditRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  async create(entry: AuthzAuditEntry): Promise<void> {
    await this.db.insert(schema.authorizationAuditLog).values({
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      allowed: entry.allowed,
      policyUsed: entry.policyUsed,
      permissionsChecked: entry.permissionsChecked,
      rolesActive: entry.rolesActive,
      reason: entry.reason,
      requestId: entry.requestId,
    });
  }
}
