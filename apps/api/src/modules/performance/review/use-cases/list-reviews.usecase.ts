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
      return this.repo.countByCycle(cycleId);
    }

    if (!user.employeeId) {
      throwForbidden(
        "Employee profile is required to view self-scoped performance reviews",
        ERROR_CODES.FORBIDDEN,
      );
    }

    const selfReviews = await this.repo.findByEmployee(user.employeeId, cycleId);
    return {
      total: selfReviews.length,
      submitted: selfReviews.filter((r) => r.status === "submitted").length,
    };
  }
}
