import { Injectable } from "@nestjs/common";
import { UpdateLeaveRequestDto } from "../dto/update-leave-request.dto";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import {
  throwBadRequest,
  throwConflict,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { LeaveRequestMapper } from "../mappers/leave-request.mapper";
import { LeaveLifecycleService } from "../services/leave-lifecycle.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class UpdateLeaveRequestUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly leaveRequestsRepo: LeaveRequestsRepository,
    private readonly lifecycleService: LeaveLifecycleService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, UpdateLeaveRequestUseCase.name);
  }

  async execute(id: string, dto: UpdateLeaveRequestDto) {
    const existing = await this.leaveRequestsRepo.findById(id);
    if (!existing) {
      throwNotFound("Leave request not found", ERROR_CODES.INVALID_REQUEST, {
        leaveRequestId: id,
      });
    }

    // In our simplified lifecycle, only draft/pending can be updated.
    // We check if transition from current to current is allowed via lifecycle logic if we wanted to be strict,
    // but usually update is restricted to certain states.
    if (!["draft", "pending"].includes(existing.status)) {
      this.lifecycleService.assertTransition(
        existing.status ,
        existing.status ,
        id,
      ); // Will throw if terminal
    }

    const startDate = dto.startDate ?? existing.startDate;
    const endDate = dto.endDate ?? existing.endDate;
    if (startDate > endDate) {
      throwBadRequest("Invalid leave date range", ERROR_CODES.INVALID_REQUEST, {
        startDate,
        endDate,
      });
    }

    const totalUnits = dto.totalUnits ?? existing.totalUnits;

    await this.leaveRequestsRepo.transaction(async (tx) => {
      if (
        (dto.startDate !== undefined || dto.endDate !== undefined) &&
        this.leaveRequestsRepo.findOverlappingApprovedRequest
      ) {
        const overlap =
          await this.leaveRequestsRepo.findOverlappingApprovedRequest(
            existing.employeeId,
            startDate,
            endDate,
            id,
            tx,
          );
        if (overlap) {
          throwConflict(
            "Leave request overlaps with an existing pending or approved request",
            ERROR_CODES.SCHEDULE_CONFLICT,
            { overlappingRequestId: overlap.id },
          );
        }
      }

      const isPaid = existing.leaveType?.isPaid ?? true;
      if (
        isPaid &&
        (dto.totalUnits !== undefined || dto.startDate !== undefined) &&
        (this.leaveRequestsRepo.lockBalanceForYear ||
          this.leaveRequestsRepo.findBalanceForYear)
      ) {
        const balanceYear = new Date(startDate).getFullYear();
        const balance = this.leaveRequestsRepo.lockBalanceForYear
          ? await this.leaveRequestsRepo.lockBalanceForYear(
              existing.employeeId,
              existing.leaveTypeId,
              balanceYear,
              tx,
            )
          : await this.leaveRequestsRepo.findBalanceForYear(
              existing.employeeId,
              existing.leaveTypeId,
              balanceYear,
              tx,
            );
        if (balance) {
          const pendingUnits = this.leaveRequestsRepo.sumPendingUnitsForYear
            ? await this.leaveRequestsRepo.sumPendingUnitsForYear(
                existing.employeeId,
                existing.leaveTypeId,
                balanceYear,
                tx,
                id,
              )
            : 0;
          const totalAvailable =
            Number(balance.openingBalance) +
            Number(balance.accruedAmount) +
            Number(balance.carriedOverAmount) +
            Number(balance.adjustedAmount) -
            Number(balance.usedAmount) -
            Number(pendingUnits);
          if (totalAvailable < Number(totalUnits)) {
            throwBadRequest(
              "Số ngày phép còn lại không đủ",
              ERROR_CODES.LEAVE_BALANCE_INSUFFICIENT,
              {
                available: totalAvailable,
                pendingReserved: Number(pendingUnits),
                requested: totalUnits,
              },
            );
          }
        }
      }

      await this.leaveRequestsRepo.update(
        id,
        LeaveRequestMapper.toEntity(dto),
        tx,
      );

      await this.leaveRequestsRepo.createAuditLog(
        null,
        "leave_request_update",
        id,
        { dto },
        tx,
      );
    });

    return LeaveRequestMapper.toResponseDto(
      await this.leaveRequestsRepo.findById(id),
    );
  }
}






