import { Module } from "@nestjs/common";
import { WorkforceShiftsController } from "./workforce-shifts.controller";
import { WorkforceShiftsRepository } from "./schedule-roster/repositories/workforce-shifts.repository";
import { ShiftOverlapService } from "./schedule-roster/services/shift-overlap.service";
import { RosterExpansionService } from "./schedule-roster/services/roster-expansion.service";
import { ShiftRosterLifecycleService } from "./schedule-roster/services/shift-roster-lifecycle.service";
import { ShiftRosterLockService } from "./schedule-roster/services/shift-roster-lock.service";
import { ShiftValidationService } from "./schedule-roster/services/shift-validation.service";
import {
  ListWorkforceShiftTemplatesUseCase,
  CreateWorkforceShiftTemplateUseCase,
  UpdateWorkforceShiftTemplateUseCase,
  ArchiveWorkforceShiftTemplateUseCase,
} from "./shift-catalog/use-cases/workforce-shift-template.usecases";
import {
  ListEmployeeShiftAssignmentsUseCase,
  CreateEmployeeShiftAssignmentUseCase,
  UpdateEmployeeShiftAssignmentUseCase,
  CancelEmployeeShiftAssignmentUseCase,
} from "./schedule-roster/use-cases/assignments/employee-shift-assignment.usecases";
import {
  ApproveShiftRosterUseCase,
  PublishShiftRosterUseCase,
  QueryShiftRosterUseCase,
  RejectShiftRosterUseCase,
  SubmitShiftRosterForApprovalUseCase,
} from "./schedule-roster/use-cases/roster/shift-roster.usecases";

@Module({
  controllers: [WorkforceShiftsController],
  providers: [
    WorkforceShiftsRepository,
    ShiftOverlapService,
    RosterExpansionService,
    ShiftRosterLifecycleService,
    ShiftRosterLockService,
    ShiftValidationService,
    ListWorkforceShiftTemplatesUseCase,
    CreateWorkforceShiftTemplateUseCase,
    UpdateWorkforceShiftTemplateUseCase,
    ArchiveWorkforceShiftTemplateUseCase,
    ListEmployeeShiftAssignmentsUseCase,
    CreateEmployeeShiftAssignmentUseCase,
    UpdateEmployeeShiftAssignmentUseCase,
    CancelEmployeeShiftAssignmentUseCase,
    QueryShiftRosterUseCase,
    SubmitShiftRosterForApprovalUseCase,
    ApproveShiftRosterUseCase,
    RejectShiftRosterUseCase,
    PublishShiftRosterUseCase,
  ],
  exports: [WorkforceShiftsRepository, ShiftRosterLockService, ShiftValidationService],
})
export class WorkforceShiftsModule {}
