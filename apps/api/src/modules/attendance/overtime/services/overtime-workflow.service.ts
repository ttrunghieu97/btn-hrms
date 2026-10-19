import { Injectable } from "@nestjs/common";
import { OvertimeRepository } from "../repositories/overtime.repository";
import {
  throwBadRequest,
  throwForbidden,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { PayrollLockService } from "./payroll-lock.service";
import { DataScope } from "../../../../core/security/types/data-scope.interface";
import { type AppDatabase } from "../../../../infrastructure/database/database-client.type";

export enum OvertimeStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export type OvertimeActorContext = {
  actorEmployeeId?: string | null;
  scope?: DataScope;
};

@Injectable()
export class OvertimeWorkflowService {
  constructor(
    private readonly repo: OvertimeRepository,
    private readonly payrollLock: PayrollLockService,
  ) {}

  private async assertCanApproveOrReject(
    requestEmployeeId: string,
    context?: OvertimeActorContext,
    tx?: AppDatabase,
  ): Promise<void> {
    if (!context) return;

    if (
      (context.actorEmployeeId && requestEmployeeId === context.actorEmployeeId) ||
      (context.scope?.tier === "self" && context.scope.employeeId === requestEmployeeId)
    ) {
      throwForbidden(
        "Cannot approve or reject your own overtime request",
        ERROR_CODES.PERMISSION_DENIED,
      );
    }

    if (context.scope?.tier === "self") {
      throwForbidden(
        "Insufficient scope to approve or reject overtime requests",
        ERROR_CODES.PERMISSION_DENIED,
      );
    }

    if (context.scope?.tier === "department") {
      if (!context.scope.departmentId) {
        throwForbidden(
          "Department scope required to approve or reject overtime requests",
          ERROR_CODES.PERMISSION_DENIED,
        );
      }
      if (typeof this.repo.isEmployeeInDepartment === "function") {
        const inDept = await this.repo.isEmployeeInDepartment(
          requestEmployeeId,
          context.scope.departmentId,
          tx,
        );
        if (!inDept) {
          throwForbidden(
            "Cannot approve or reject overtime request outside your department",
            ERROR_CODES.PERMISSION_DENIED,
          );
        }
      }
    }
  }

  async submitRequest(data: {
    employeeId: string;
    workDate: string;
    requestedMinutes: number;
    candidateMinutes: number;
    requestNote?: string;
  }) {
    await this.payrollLock.ensureDateNotLocked(data.workDate);

    const existing = await this.repo.findByEmployeeAndDate(
      data.employeeId,
      data.workDate,
    );
    if (existing && existing.status !== OvertimeStatus.CANCELLED) {
      throwBadRequest(
        "Overtime request already exists for this date",
        ERROR_CODES.INVALID_REQUEST,
      );
    }

    return this.repo.create({
      ...data,
      status: OvertimeStatus.PENDING,
      approvedMinutes: 0,
    });
  }

  async approveRequest(
    id: string,
    approvedByUserId: string,
    approvedMinutes?: number,
    context?: OvertimeActorContext,
  ) {
    return this.repo.transaction(async (tx) => {
      const request = await this.repo.findById(id, tx);
      if (!request)
        throwNotFound("Overtime request not found", ERROR_CODES.INVALID_REQUEST);

      await this.assertCanApproveOrReject(request.employeeId, context, tx);
      await this.payrollLock.ensureDateNotLocked(request.workDate);

      if (request.status !== OvertimeStatus.PENDING) {
        throwBadRequest(
          "Only pending requests can be approved",
          ERROR_CODES.INVALID_STATUS_TRANSITION,
        );
      }

      return this.repo.update(id, {
        status: OvertimeStatus.APPROVED,
        approvedMinutes: approvedMinutes ?? request.requestedMinutes,
        approvedByUserId,
        approvedAt: new Date(),
      }, tx);
    });
  }

  async rejectRequest(
    id: string,
    approvedByUserId: string,
    reason: string,
    context?: OvertimeActorContext,
  ) {
    return this.repo.transaction(async (tx) => {
      const request = await this.repo.findById(id, tx);
      if (!request)
        throwNotFound("Overtime request not found", ERROR_CODES.INVALID_REQUEST);

      await this.assertCanApproveOrReject(request.employeeId, context, tx);
      await this.payrollLock.ensureDateNotLocked(request.workDate);

      if (request.status !== OvertimeStatus.PENDING) {
        throwBadRequest(
          "Only pending requests can be rejected",
          ERROR_CODES.INVALID_STATUS_TRANSITION,
        );
      }

      return this.repo.update(id, {
        status: OvertimeStatus.REJECTED,
        rejectionReason: reason,
        approvedByUserId,
        approvedAt: new Date(),
      }, tx);
    });
  }
}



