import { Injectable } from "@nestjs/common";
import { OvertimeRepository } from "../repositories/overtime.repository";
import {
  throwBadRequest,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { PayrollLockService } from "./payroll-lock.service";

export enum OvertimeStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

@Injectable()
export class OvertimeWorkflowService {
  constructor(
    private readonly repo: OvertimeRepository,
    private readonly payrollLock: PayrollLockService,
  ) {}

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

  async approveRequest(id: string, approvedByUserId: string, approvedMinutes?: number) {
    return this.repo.transaction(async (tx) => {
      const request = await this.repo.findById(id, tx);
      if (!request)
        throwNotFound("Overtime request not found", ERROR_CODES.INVALID_REQUEST);

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

  async rejectRequest(id: string, approvedByUserId: string, reason: string) {
    return this.repo.transaction(async (tx) => {
      const request = await this.repo.findById(id, tx);
      if (!request)
        throwNotFound("Overtime request not found", ERROR_CODES.INVALID_REQUEST);

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



