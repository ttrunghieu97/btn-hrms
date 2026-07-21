import { Injectable, Inject, Optional } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { PolicyEvaluationResult } from "../policy-engine/policy-engine.types";
import { AuthUser } from "../types/auth-user.interface";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { AuthorizationAuditRepository } from "./authorization-audit.repository";

export interface AuthzAuditEntry {
  userId: string | null;
  action: string;
  resource?: string;
  resourceId?: string;
  allowed: boolean;
  policyUsed?: string;
  permissionsChecked: string[];
  rolesActive: string[];
  reason?: string;
  requestId?: string;
}

/**
 * AuthorizationAuditService
 *
 * Writes per-decision authorization audit entries. Persistence is best-effort
 * and fire-and-forget ? a failed write never blocks the original request.
 */
@Injectable()
export class AuthorizationAuditService {
  private readonly logger: ContextLogger;

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly auditRepo: AuthorizationAuditRepository,
    @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
  ) {
    this.logger = new ContextLogger(
      requestContext,
      AuthorizationAuditService.name,
    );
  }

  /**
   * Record an authorization decision.
   * Call this from the AuthorizationGuard ? always non-blocking.
   */
  record(
    user: AuthUser | null,
    action: string,
    result: PolicyEvaluationResult,
    meta?: { resource?: string; resourceId?: string },
  ): void {
    const ctx = this.requestContext.get();

    const entry: AuthzAuditEntry = {
      userId: user?.id ?? null,
      action,
      resource: meta?.resource,
      resourceId: meta?.resourceId,
      allowed: result.allowed,
      policyUsed: result.policyUsed,
      permissionsChecked: result.permissionsChecked,
      rolesActive: user?.roles ?? [],
      reason: result.reason,
      requestId: ctx?.requestId,
    };

    // Structured log ? picked up by OpenTelemetry / Loki / Datadog
    if (!result.allowed) {
      this.logger.warn({ msg: "authz_denied", ...entry });
    } else if (result.decidedBy !== "super_admin") {
      this.logger.debug({ msg: "authz_allowed", ...entry });
    }

    // Async DB write to authorization_audit_log table
    void this.auditRepo.create(entry).catch((err) =>
      this.logger.error({
        msg: "authz_audit_write_failed",
        reason: err?.message,
      }),
    );
  }
}
