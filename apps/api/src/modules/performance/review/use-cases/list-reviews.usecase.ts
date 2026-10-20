import { Injectable } from "@nestjs/common";
import { hasPermission } from "@project/permissions";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";
import type { AuthUser } from "../../../../core/security/types/auth-user.interface";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwForbidden } from "../../../../shared/utils/http-error";
import { ReviewAssignmentRepository } from "../repositories/review-assignment.repository";

@Injectable()
export class ListReviewsUseCase {
  constructor(private readonly repo: ReviewAssignmentRepository) {}

  async execute(cycleId: string, user?: AuthUser) {
    const canManage =
      !user ||
      Boolean(user.isSuperAdmin) ||
      hasPermission(user.permissions ?? [], Permissions.PERFORMANCE_MANAGE);

    if (canManage) {
      if (typeof this.repo.findByCycleWithNames === "function") {
        const rows = await this.repo.findByCycleWithNames(cycleId);
        return {
          total: rows.length,
          submitted: rows.filter((r) => r.status === "submitted").length,
          rows,
        };
      }
      return this.repo.countByCycle(cycleId);
    }

    if (!user.employeeId) {
      throwForbidden(
        "Employee profile is required to view self-scoped performance reviews",
        ERROR_CODES.FORBIDDEN,
      );
    }

    if (typeof this.repo.findByCycleWithNames === "function") {
      const rows = await this.repo.findByCycleWithNames(cycleId, user.employeeId);
      return {
        total: rows.length,
        submitted: rows.filter((r) => r.status === "submitted").length,
        rows,
      };
    }

    const selfReviews = await this.repo.findByEmployee(user.employeeId, cycleId);
    return {
      total: selfReviews.length,
      submitted: selfReviews.filter((r) => r.status === "submitted").length,
    };
  }
}
