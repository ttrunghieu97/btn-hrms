import { Injectable } from "@nestjs/common";
import { UpdateLeaveRequestDto } from "../dto/update-leave-request.dto";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import {
  throwBadRequest,
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

    await this.leaveRequestsRepo.transaction(async () => {
      await this.leaveRequestsRepo.update(
        id,
        LeaveRequestMapper.toEntity(dto) ,
      );

      await this.leaveRequestsRepo.createAuditLog(
        null,
        "leave_request_update",
        id,
        { dto },
      );
    });

    return LeaveRequestMapper.toResponseDto(
      await this.leaveRequestsRepo.findById(id),
    );
  }
}






