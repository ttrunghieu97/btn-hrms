import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { WorkforceTimeManagementPort } from "../ports/workforce-time-management.port";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import * as schema from "../../infrastructure/database/schema";
import { WorkforceIdentityAcl } from "../acls/workforce-identity.acl";
import { CONTRACTS_TOKENS } from "../contracts.tokens";

@Injectable()
export class WorkforceTimeManagementAdapter implements WorkforceTimeManagementPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CONTRACTS_TOKENS.WORKFORCE_IDENTITY_ACL)
    private readonly workforceIdentityAcl: WorkforceIdentityAcl,
  ) {}

  async getEmployeeContext(employeeId: string): Promise<{
    employeeId: string;
    userId: string;
    departmentId: string | null;
    employmentStatus: string;
    currentSite?: {
      id: string;
      latitude: string | null;
      longitude: string | null;
      radiusMeters: number | null;
      allowedIpCidrs: string[] | null;
    } | null;
    currentSiteId?: string | null;
  } | null> {
    const row = await this.db.query.employees.findFirst({
      where: eq(schema.employees.id, employeeId),
      columns: {
        id: true,
        userId: true,
        departmentId: true,
        status: true,
        locationId: true,
      },
    });

    if (!row) return null;

    const normalized = this.workforceIdentityAcl.mapToTimeEligibility({
      employmentStatus: String(row.status),
      departmentId: row.departmentId ?? null,
    });

    let currentSite = null;
    if (row.locationId) {
      const loc = await this.db.query.locations.findFirst({
        where: eq(schema.locations.id, row.locationId),
        columns: {
          id: true,
          latitude: true,
          longitude: true,
          radiusMeters: true,
          allowedIpCidrs: true,
        },
      });
      if (loc) {
        currentSite = {
          id: loc.id,
          latitude: loc.latitude,
          longitude: loc.longitude,
          radiusMeters: loc.radiusMeters,
          allowedIpCidrs: normalizeAllowedIpCidrs(loc.allowedIpCidrs),
        };
      }
    }

    return {
      employeeId: row.id,
      userId: row.userId,
      departmentId: normalized.departmentId,
      employmentStatus: normalized.timeEligibilityStatus,
      currentSite,
      currentSiteId: row.locationId,
    };
  }
}

function normalizeAllowedIpCidrs(raw: unknown): string[] | null {
  if (raw === null || raw === undefined) return null;
  if (Array.isArray(raw)) {
    const cleaned = raw.filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
    return cleaned.length > 0 ? cleaned : null;
  }
  return null;
}
