import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { LeaveManagementModule } from "./leave-management/leave-management.module";
import { LeaveAdminModule } from "./leave-admin/leave-admin.module";

@Module({
  imports: [
    LeaveManagementModule,
    LeaveAdminModule,
    RouterModule.register([
      { path: "leave/management", module: LeaveManagementModule },
      { path: "leave/admin", module: LeaveAdminModule },
    ]),
  ],
  exports: [LeaveManagementModule, LeaveAdminModule],
})
export class LeaveDomainModule {}
