import { Injectable, Inject } from "@nestjs/common";
import { BOARDING_PROCESS_READER_PORT, type IBoardingProcessReader } from "../../../contracts/ports/boarding-process-reader.port";
import { OffboardingRepository } from "../repositories/offboarding.repository";
import { throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import type { OffboardingProcessDetailDto } from "../dto/offboarding-process-response.dto";

@Injectable()
export class GetOffboardingUseCase {
  constructor(
    @Inject(BOARDING_PROCESS_READER_PORT)
    private readonly processReader: IBoardingProcessReader,
    private readonly offboardingRepo: OffboardingRepository,
  ) {}

  async execute(id: string): Promise<OffboardingProcessDetailDto> {
    const process = await this.processReader.findByIdWithItems(id);
    if (process?.type !== "offboarding") {
      throwNotFound(
        "Offboarding process not found",
        ERROR_CODES.OFFBOARDING_PROCESS_NOT_FOUND,
        { id },
      );
    }

    const clearances = await this.offboardingRepo.findClearancesByProcessId(id);
    const settlement = await this.offboardingRepo.findSettlementByProcessId(id);
    const interview = await this.offboardingRepo.findExitInterviewByProcessId(id);

    return {
      id: process.id,
      employeeId: process.employeeId,
      templateId: process.templateId,
      type: process.type,
      status: process.status,
      startDate: process.startDate,
      targetEndDate: process.targetEndDate,
      completedAt: process.completedAt?.toISOString() ?? null,
      checklistItems: process.checklistItems.map((ci) => ({
        id: ci.id,
        title: ci.title,
        mandatory: ci.mandatory,
        status: ci.status,
        dueDate: ci.dueDate,
        isCompleted: ci.isCompleted,
        completedAt: ci.completedAt?.toISOString() ?? null,
        completedByUserID: ci.completedByUserID,
      })),
      clearances: clearances.map((c) => ({
        id: c.id,
        department: c.department,
        decision: c.decision,
        decidedByUserId: c.decidedByUserId,
        note: c.note,
        decidedAt: c.decidedAt,
      })),
      exitInterview: interview
        ? {
            id: interview.id,
            scheduledAt: interview.scheduledAt?.toISOString() ?? null,
            conductedAt: interview.conductedAt?.toISOString() ?? null,
          }
        : null,
      settlement: settlement
        ? {
            status: settlement.status,
            payrollRef: settlement.payrollRef,
            isOutstanding: settlement.status !== "settled",
          }
        : null,
      createdAt: process.createdAt,
      updatedAt: process.updatedAt,
    };
  }
}
