import { Module } from "@nestjs/common";
import { OvertimeController } from "./overtime.controller";
import { OvertimeWorkflowService } from "./services/overtime-workflow.service";
import { OvertimeCalculationService } from "./services/overtime-calculation.service";
import { PayrollLockService } from "./services/payroll-lock.service";
import { OvertimeRepository } from "./repositories/overtime.repository";
import { PayrollLockRepository } from "./repositories/payroll-lock.repository";
import { AttendanceSummariesModule } from "../attendance-summaries/attendance-summaries.module";
import { ListOvertimeRequestsUseCase } from "./use-cases/list-overtime-requests.usecase";
import { SubmitOvertimeRequestUseCase } from "./use-cases/submit-overtime-request.usecase";
import { ApproveOvertimeRequestUseCase } from "./use-cases/approve-overtime-request.usecase";
import { RejectOvertimeRequestUseCase } from "./use-cases/reject-overtime-request.usecase";

@Module({
  imports: [AttendanceSummariesModule],
  controllers: [OvertimeController],
  providers: [
    OvertimeWorkflowService,
    OvertimeCalculationService,
    PayrollLockService,
    PayrollLockRepository,
    OvertimeRepository,
    ListOvertimeRequestsUseCase,
    SubmitOvertimeRequestUseCase,
    ApproveOvertimeRequestUseCase,
    RejectOvertimeRequestUseCase,
  ],
  exports: [OvertimeWorkflowService, OvertimeRepository],
})
export class AttendanceOvertimeModule {}



