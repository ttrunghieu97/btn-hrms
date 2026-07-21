import { Module } from "@nestjs/common";
import { LeaveManagementController } from "./leave-management.controller";
import { LeaveRequestsRepository } from "./repositories/leave-requests.repository";
import { ListLeaveRequestsUseCase } from "./use-cases/list-leave-requests.usecase";
import { GetLeaveRequestUseCase } from "./use-cases/get-leave-request.usecase";
import { CreateLeaveRequestUseCase } from "./use-cases/create-leave-request.usecase";
import { UpdateLeaveRequestUseCase } from "./use-cases/update-leave-request.usecase";
import { CancelLeaveRequestUseCase } from "./use-cases/cancel-leave-request.usecase";
import { ListEmployeeLeaveBalancesUseCase } from "./use-cases/list-employee-leave-balances.usecase";
import { LeaveLifecycleService } from "./services/leave-lifecycle.service";
import { LeaveAttendanceReconciliationService } from "./services/leave-attendance-reconciliation.service";
import { LeaveApprovalPolicyService } from "./services/leave-approval-policy.service";
import { LeaveEmployeeLifecycleSubscriber } from "../subscribers/employee-lifecycle.subscriber";

@Module({
  controllers: [LeaveManagementController],
  providers: [
    LeaveRequestsRepository,
    LeaveLifecycleService,
    LeaveAttendanceReconciliationService,
    LeaveApprovalPolicyService,
    LeaveEmployeeLifecycleSubscriber,
    ListLeaveRequestsUseCase,
    GetLeaveRequestUseCase,
    CreateLeaveRequestUseCase,
    UpdateLeaveRequestUseCase,
    CancelLeaveRequestUseCase,
    ListEmployeeLeaveBalancesUseCase,
  ],
  exports: [LeaveRequestsRepository, LeaveLifecycleService, LeaveAttendanceReconciliationService],
})
export class LeaveManagementModule {}


