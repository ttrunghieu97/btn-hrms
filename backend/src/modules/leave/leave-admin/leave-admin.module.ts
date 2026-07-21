import { Module } from "@nestjs/common";
import { LeaveAdminController } from "./leave-admin.controller";
import { LeaveAdminRepository } from "./repositories/leave-admin.repository";
import {
  CreateLeavePolicyUseCase,
  CreateLeaveTypeUseCase,
  ListLeavePoliciesUseCase,
  ListLeaveTypesUseCase,
  UpdateLeavePolicyUseCase,
  UpdateLeaveTypeUseCase,
} from "./use-cases/leave-admin.usecases";

@Module({
  controllers: [LeaveAdminController],
  providers: [
    LeaveAdminRepository,
    ListLeavePoliciesUseCase,
    CreateLeavePolicyUseCase,
    UpdateLeavePolicyUseCase,
    ListLeaveTypesUseCase,
    CreateLeaveTypeUseCase,
    UpdateLeaveTypeUseCase,
  ],
})
export class LeaveAdminModule {}


