import { Injectable } from "@nestjs/common";
import { CreateLeaveRequestDto } from "../dto/create-leave-request.dto";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import { LeaveAttendanceReconciliationService } from "../services/leave-attendance-reconciliation.service";
import {
  throwBadRequest,
  throwConflict,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { LeaveRequestMapper } from "../mappers/leave-request.mapper";
import { LeaveApprovalRequestedEvent } from "../../../../core/events/events/leave-approval-requested.event";
import { LeaveApprovedEvent } from "../../../../core/events/events/leave-approved.event";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateLeaveRequestUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly leaveRequestsRepo: LeaveRequestsRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly reconciliationService: LeaveAttendanceReconciliationService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateLeaveRequestUseCase.name);
  }

  async execute(dto: CreateLeaveRequestDto, requesterEmployeeId?: string) {
    const employeeId = requesterEmployeeId ?? dto.employeeId;
    if (dto.startDate > dto.endDate) {
      throwBadRequest("Invalid leave date range", ERROR_CODES.INVALID_REQUEST, {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    }

    const [employee, leaveType] = await Promise.all([
      this.leaveRequestsRepo.findEmployeeById(employeeId),
      this.leaveRequestsRepo.findLeaveTypeById(dto.leaveTypeId),
    ]);

    if (!employee) {
      throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
        employeeId,
      });
    }
    if (!leaveType) {
      throwNotFound("Leave type not found", ERROR_CODES.INVALID_REQUEST, {
        leaveTypeId: dto.leaveTypeId,
      });
    }

    // Notice check
    if (leaveType.minNoticeHours) {
      const now = new Date();
      const start = new Date(dto.startDate);
      const diffMs = start.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < leaveType.minNoticeHours) {
        throwBadRequest(
          `Minimum notice of ${leaveType.minNoticeHours} hours required`,
          ERROR_CODES.INVALID_REQUEST,
        );
      }
    }

    // Overlap check — prevent double-booking BEFORE create
    const overlap = await this.leaveRequestsRepo.findOverlappingApprovedRequest(
      employeeId,
      dto.startDate,
      dto.endDate,
    );
    if (overlap) {
      throwConflict(
        "Leave request overlaps with an existing approved request",
        ERROR_CODES.SCHEDULE_CONFLICT,
        { overlappingRequestId: overlap.id },
      );
    }

    const requiresApproval = leaveType.requiresApproval ?? true;
    const initialStatus = requiresApproval ? "pending" : "approved";

    const created = await this.leaveRequestsRepo.transaction(async (tx) => {
      const record = await this.leaveRequestsRepo.create({
        ...LeaveRequestMapper.toEntity({ ...dto, employeeId }),
        status: initialStatus,
      } as any);

      await this.leaveRequestsRepo.createAuditLog(
        null,
        "leave_request_create",
        record!.id,
        { status: initialStatus, units: dto.totalUnits },
      );

      if (requiresApproval) {
        // INTENT event only — final state comes from engine via LeaveDecisionHandler
        await this.eventOutbox.stage(
          new LeaveApprovalRequestedEvent({
            idempotencyKey: `${record!.id}:leave.approval.requested`,
            leaveRequestId: record!.id,
            employeeId,
            leaveTypeId: dto.leaveTypeId,
            requestedByUserId: employee.userId,
            requestedAt: new Date().toISOString(),
          }),
          tx,
        );
      } else {
        // Auto-approve: no engine involved → CreateLeave IS the decision source
        const balanceYear = new Date(dto.startDate).getFullYear();
        const balance = await this.leaveRequestsRepo.findBalanceForYear(
          employeeId,
          dto.leaveTypeId,
          balanceYear,
        );
        if (balance) {
          await this.leaveRequestsRepo.incrementUsedBalance(
            balance.id,
            dto.totalUnits,
            tx,
          );
        }

        await this.eventOutbox.stage(
          new LeaveApprovedEvent({
            idempotencyKey: `${record!.id}:leave.approved`,
            leaveRequestId: record!.id,
            employeeId,
            approvedByUserId: null,
            approvedAt: new Date().toISOString(),
            autoApproved: true,
          }),
          tx,
        );
      }

      return record;
    });

    // Reconciliation for auto-approved requests
    if (!requiresApproval) {
      const approved = await this.leaveRequestsRepo.findById(created!.id);
      if (approved) {
        await this.reconciliationService.reconcileApprovedLeave(approved);
      }
    }

    return LeaveRequestMapper.toResponseDto(
      await this.leaveRequestsRepo.findById(created!.id),
    );
  }
}
