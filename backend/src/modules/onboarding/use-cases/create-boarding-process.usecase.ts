import { formatDateISO } from "@/shared/utils/date-format";
import { Injectable, Inject } from "@nestjs/common";
import { OnboardingProcessRepository } from "../repositories/onboarding-process.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { throwNotFound, throwConflict } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { EMPLOYEE_READER_PORT } from "../../../contracts/ports/employee-reader.port";
import type { IEmployeeReader } from "../../../contracts/ports/employee-reader.port";
import type { CreateOnboardingProcessDto } from "../dto/create-onboarding-process.dto";
import type { CreateOnboardingProcessResponseDto } from "../dto/onboarding-process-response.dto";
import { OnboardingProcessCreatedEvent } from "../events/onboarding-process-created.event";

export interface CreateBoardingProcessInput {
  employeeId: string;
  templateId: string;
  type: "onboarding" | "offboarding";
  joinDate?: string;
}

@Injectable()
export class CreateBoardingProcessUseCase {
  constructor(
    private readonly processRepo: OnboardingProcessRepository,
    private readonly outbox: EventOutboxService,
    @Inject(EMPLOYEE_READER_PORT)
    private readonly employeeReader: IEmployeeReader,
  ) {}

  async execute(
    input: CreateBoardingProcessInput,
  ): Promise<CreateOnboardingProcessResponseDto> {
    const { employeeId, templateId, type, joinDate } = input;

    // 1. Validate employee exists
    const employee = await this.employeeReader.findEmployeeById(employeeId);
    if (!employee) {
      throwNotFound(
        "Employee not found",
        ERROR_CODES.EMPLOYEE_NOT_FOUND,
        { employeeId },
      );
    }

    // 2. Check no active process of this type exists
    const activeProcess = await this.processRepo.findActiveByEmployeeId(
      employeeId,
      type,
    );
    if (activeProcess) {
      throwConflict(
        `Employee already has an active ${type} process`,
        "BOARDING_PROCESS_ALREADY_EXISTS",
        {
          employeeId,
          existingProcessId: activeProcess.id,
          type,
        },
      );
    }

    // 3. Load template
    const template = await this.processRepo.findActiveTemplate(templateId);
    if (!template) {
      throwNotFound(
        "Template not found or inactive",
        ERROR_CODES.ONBOARDING_TEMPLATE_NOT_FOUND,
        { templateId },
      );
    }

    // 4. Determine start date
    const employeeStartDate =
      (employee as any).startDate ?? employee.startDate;
    const startDateStr = joinDate ?? employeeStartDate;
    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) {
      throw new Error(
        `Invalid start date: ${startDateStr}. Provide a start date or ensure employee.startDate is set.`,
      );
    }

    // 5. Build inputs
    const startDateOnlyStr = formatDateISO(startDate) ?? "";

    const checklistItems = template.items.map((item) => {
      const due = new Date(startDate);
      due.setDate(due.getDate() + item.dueDaysOffset);
      const dueDateStr = formatDateISO(due);

      return {
        title: item.title,
        dueDaysOffset: item.dueDaysOffset,
        mandatory: item.isMandatory,
        templateItemId: item.id,
        assigneeUserId: item.defaultAssigneeUserId,
        dueDate: dueDateStr ?? null,
        sortOrder: item.sortOrder,
      };
    });

    // 6. Create process + items in transaction
    const result = await this.processRepo.createProcessWithItems(
      {
        employeeId,
        templateId: template.template.id,
        type,
        status: "in_progress",
        startDate: startDateOnlyStr,
        targetEndDate: null,
        assignedHrUserId: null,
      },
      checklistItems,
    );

    // 7. Build response
    const response: CreateOnboardingProcessResponseDto = {
      id: result.id,
      employeeId: result.employeeId,
      templateId: result.templateId,
      type: result.type,
      status: result.status,
      startDate: result.startDate,
      targetEndDate: result.targetEndDate,
      assignedHrUserId: result.assignedHrUserId,
      checklistItems: result.checklistItems.map((ci) => ({
        id: ci.id,
        title: ci.title,
        dueDaysOffset: ci.dueDaysOffset,
        mandatory: ci.mandatory,
        dueDate: ci.dueDate,
        isCompleted: ci.isCompleted,
        completedAt: ci.completedAt
          ? ci.completedAt.toISOString()
          : null,
        completedByUserID: ci.completedByUserID,
        createdAt: ci.createdAt,
        updatedAt: ci.updatedAt,
      })),
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    // 8. Dispatch event via outbox
    const event = new OnboardingProcessCreatedEvent(
      result.id,
      result.employeeId,
      result.templateId,
      response,
    );
    await this.outbox.stage(event).catch((err: Error) => {
      console.error(
        `[CreateBoardingProcessUseCase] Failed to stage event: ${err.message}`,
      );
    });

    return response;
  }
}
