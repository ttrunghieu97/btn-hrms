import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiResponse,
  ApiQuery,
} from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { Resource } from "../../../core/security/decorators/resource.decorator";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { Employee } from "../../../core/security/types/resource-entities";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { DeleteEmployeeUseCase } from "./use-cases/delete-employee.usecase";
import { RestoreEmployeeUseCase } from "./use-cases/restore-employee.usecase";
import { ListEmployeeStatusHistoryUseCase } from "./use-cases/list-employee-status-history.usecase";
import { PurgeEmployeeUseCase } from "./use-cases/purge-employee.usecase";
import { ResetEmployeePasswordUseCase } from "./use-cases/reset-employee-password.usecase";
import { CheckUsernameUseCase } from "./use-cases/check-username.usecase";
import { CheckUsernameDto } from "./dto/check-username.dto";
import { CheckEmployeeCodeUseCase } from "./use-cases/check-employee-code.usecase";
import { CheckEmployeeCodeDto } from "./dto/check-employee-code.dto";
import { BulkChangeStatusUseCase } from "./use-cases/bulk-change-status.usecase";
import { BulkArchiveUseCase } from "./use-cases/bulk-archive.usecase";
import { ScheduleTerminationUseCase } from "./use-cases/schedule-termination.usecase";
import { CancelScheduledTerminationUseCase } from "./use-cases/cancel-scheduled-termination.usecase";
import { RestoreArchivedEmployeeUseCase } from "./use-cases/restore-archived-employee.usecase";
import { RehireEmployeeUseCase } from "./use-cases/rehire-employee.usecase";
import { RequestTransferUseCase } from "./use-cases/request-transfer.usecase";
import { ApproveTransferUseCase } from "./use-cases/approve-transfer.usecase";
import { RejectTransferUseCase } from "./use-cases/reject-transfer.usecase";
import { CancelTransferUseCase } from "./use-cases/cancel-transfer.usecase";
import { ApplyTransferUseCase } from "./use-cases/apply-transfer.usecase";import { ChangeEmployeeStatusUseCase } from "./use-cases/change-employee-status.usecase";
import { ChangeEmployeeStatusDto } from "./dto/change-employee-status.dto";
import { TerminateEmployeeUseCase } from "../application/use-cases/terminate-employee.usecase";
import { TerminateEmployeeDto } from "./dto/terminate-employee.dto";
import { EmployeeUsernameCheckEnvelopeDto } from "./dto/employee-response.dto";
import { EmployeeStatusHistoryEnvelopeDto } from "./dto/employee-status-history.dto";

@ApiTags("Employee Admin")
@ApiBearerAuth()
@Controller("employees")
export class EmployeeAdminController {
  constructor(
    private readonly checkUsername: CheckUsernameUseCase,
    private readonly checkEmployeeCodeUseCase: CheckEmployeeCodeUseCase,
    private readonly deleteEmployee: DeleteEmployeeUseCase,
    private readonly restoreEmployee: RestoreEmployeeUseCase,
    private readonly purgeEmployee: PurgeEmployeeUseCase,
    private readonly resetEmployeePassword: ResetEmployeePasswordUseCase,
    private readonly scheduleTerminationUseCase: ScheduleTerminationUseCase,
    private readonly cancelScheduleTermination: CancelScheduledTerminationUseCase,
    private readonly restoreArchived: RestoreArchivedEmployeeUseCase,
    private readonly rehire: RehireEmployeeUseCase,
    private readonly requestTransferUseCase: RequestTransferUseCase,
    private readonly approveTransferUseCase: ApproveTransferUseCase,
    private readonly rejectTransferUseCase: RejectTransferUseCase,
    private readonly cancelTransferUseCase: CancelTransferUseCase,
    private readonly applyTransferUseCase: ApplyTransferUseCase,
    private readonly bulkChangeStatus: BulkChangeStatusUseCase,
    private readonly bulkArchiveUseCase: BulkArchiveUseCase,
    private readonly changeEmployeeStatus: ChangeEmployeeStatusUseCase,
    private readonly terminateEmployee: TerminateEmployeeUseCase,
    private readonly listEmployeeStatusHistory: ListEmployeeStatusHistoryUseCase,
  ) {}

  @Get("check-code")
  @CheckPolicy(EmployeePolicies.view)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: "Check if employee code exists" })
  @ApiQuery({ name: "employeeCode", required: true, type: String })
  @ApiResponse({ status: 200, description: "Check result" })
  async checkEmployeeCode(
    @Query() query: CheckEmployeeCodeDto,
  ) {
    return this.checkEmployeeCodeUseCase.execute(query.employeeCode);
  }

  @Get("check-username")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "Check username availability" })
  @ApiQuery({ name: "username", required: true, type: String })
  @ApiOkResponse({ type: EmployeeUsernameCheckEnvelopeDto })
  checkUsernameAvailability(@Query() query: CheckUsernameDto) {
    return this.checkUsername.execute(query.username);
  }

  @Get(":id/status-history")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Resource(Employee, "id")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "Get employee status change history" })
  @ApiOkResponse({ type: EmployeeStatusHistoryEnvelopeDto })
  statusHistory(
    @Param("id") id: string,
  ) {
    return this.listEmployeeStatusHistory.execute(id);
  }

  @Put(":id/change-status")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Resource(Employee, "id")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "employee_change_status", entity: "employee" })
  @ApiOperation({ summary: "Change employee lifecycle status" })
  changeStatus(
    @Param("id") id: string,
    @Body() dto: ChangeEmployeeStatusDto,
  ) {
    return this.changeEmployeeStatus.execute(id, dto);
  }

  @Put(":id/terminate")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Resource(Employee, "id")
  @CheckPolicy(EmployeePolicies.edit)
  @AuditLog({ action: "employee_terminate", entity: "employee" })
  @ApiOperation({ summary: "Terminate an employee" })
  async terminate(
    @Param("id") id: string,
    @Body() dto: TerminateEmployeeDto,
  ) {
    await this.terminateEmployee.execute(id, dto);
    return { success: true };
  }

  @Delete(":id")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Resource(Employee, "id")
  @CheckPolicy(EmployeePolicies.delete)
  @AuditLog({ action: "employee_delete", entity: "employee" })
  @ApiOperation({ summary: "Remove an employee profile" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
      },
    },
  })
  remove(@Param("id") id: string) {
    return this.deleteEmployee.execute(id);
  }

  @Post(":id/restore")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Resource(Employee, "id")
  @CheckPolicy(EmployeePolicies.manage)
  @AuditLog({ action: "employee_restore", entity: "employee" })
  @ApiOperation({ summary: "Restore a soft-deleted employee profile" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
      },
    },
  })
  restore(@Param("id") id: string) {
    // Legacy endpoint — delegates to restore-archived
    return this.restoreArchived.execute(id);
  }

  @Post(":id/rehire")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Resource(Employee, "id")
  @CheckPolicy(EmployeePolicies.manage)
  @AuditLog({ action: "employee_rehire", entity: "employee" })
  @ApiOperation({ summary: "Rehire a terminated employee (new employment cycle)" })
  rehireEmployee(
    @Param("id") id: string,
    @Body() dto: any,
  ) {
    return this.rehire.execute(id, dto);
  }

  @Delete(":id/purge")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Resource(Employee, "id")
  @CheckPolicy(EmployeePolicies.purge)
  @AuditLog({ action: "employee_purge", entity: "employee" })
  @ApiOperation({ summary: "Permanently delete an employee profile and files" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
      },
    },
  })
  purge(@Param("id") id: string) {
    return this.purgeEmployee.execute(id);
  }

  @Post(":id/schedule-termination")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Resource(Employee, "id")
  @CheckPolicy(EmployeePolicies.terminate)
  @AuditLog({ action: "employee_schedule_termination", entity: "employee" })
  @ApiOperation({ summary: "Schedule employee termination (future effective date)" })
  scheduleTermination(
    @Param("id") id: string,
    @Body() dto: any,
  ) {
    return this.scheduleTerminationUseCase.execute(id, dto);
  }

  @Delete(":id/scheduled-termination")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Resource(Employee, "id")
  @CheckPolicy(EmployeePolicies.terminate)
  @AuditLog({ action: "employee_cancel_scheduled_termination", entity: "employee" })
  @ApiOperation({ summary: "Cancel a pending scheduled termination" })
  cancelScheduledTermination(@Param("id") id: string) {
    return this.cancelScheduleTermination.execute(id);
  }

  @Post(":id/transfers")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Resource(Employee, "id")
  @CheckPolicy(EmployeePolicies.manage)
  @AuditLog({ action: "employee_transfer_request", entity: "employee" })
  @ApiOperation({ summary: "Request employee transfer (start approval workflow)" })
  requestEmployeeTransfer(
    @Param("id") id: string,
    @Body() dto: any,
  ) {
    return this.requestTransferUseCase.execute(id, dto);
  }

  @Post(":id/transfers/:instanceId/manager-approve")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @CheckPolicy(EmployeePolicies.view)
  @AuditLog({ action: "employee_transfer_manager_approve", entity: "employee" })
  @ApiOperation({ summary: "Manager approves transfer request" })
  managerApproveTransfer(
    @Param("id") id: string,
    @Param("instanceId") instanceId: string,
  ) {
    return this.approveTransferUseCase.execute(id, instanceId, "manager");
  }

  @Post(":id/transfers/:instanceId/hr-approve")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @CheckPolicy(EmployeePolicies.manage)
  @AuditLog({ action: "employee_transfer_hr_approve", entity: "employee" })
  @ApiOperation({ summary: "HR approves transfer request (auto-apply if effective)" })
  hrApproveTransfer(
    @Param("id") id: string,
    @Param("instanceId") instanceId: string,
  ) {
    return this.approveTransferUseCase.execute(id, instanceId, "hr");
  }

  @Post(":id/transfers/:instanceId/reject")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @CheckPolicy(EmployeePolicies.manage)
  @AuditLog({ action: "employee_transfer_reject", entity: "employee" })
  @ApiOperation({ summary: "Reject a pending transfer request" })
  rejectTransfer(
    @Param("id") id: string,
    @Param("instanceId") instanceId: string,
    @Body() dto: any,
  ) {
    return this.rejectTransferUseCase.execute(id, instanceId, dto?.note);
  }

  @Post(":id/transfers/:instanceId/apply")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @CheckPolicy(EmployeePolicies.manage)
  @AuditLog({ action: "employee_transfer_apply", entity: "employee" })
  @ApiOperation({ summary: "Manually apply an approved transfer (effective-dated)" })
  applyTransfer(
    @Param("id") id: string,
    @Param("instanceId") instanceId: string,
  ) {
    return this.applyTransferUseCase.execute(instanceId);
  }

  @Post(":id/transfers/:instanceId/cancel")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @AuditLog({ action: "employee_transfer_cancel", entity: "employee" })
  @ApiOperation({ summary: "Cancel a pending transfer request" })
  cancelTransfer(
    @Param("id") id: string,
    @Param("instanceId") instanceId: string,
  ) {
    return this.cancelTransferUseCase.execute(id, instanceId);
  }

  @Post("bulk/status")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @CheckPolicy(EmployeePolicies.manage)
  @AuditLog({ action: "employee_bulk_status", entity: "employee" })
  @ApiOperation({ summary: "Bulk change employee status (partial failure supported)" })
  bulkStatus(@Body() dto: any) {
    return this.bulkChangeStatus.execute(dto);
  }

  @Post("bulk/archive")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @CheckPolicy(EmployeePolicies.manage)
  @AuditLog({ action: "employee_bulk_archive", entity: "employee" })
  @ApiOperation({ summary: "Bulk archive employees (only terminal status)" })
  bulkArchiveOp(@Body() dto: any) {
    return this.bulkArchiveUseCase.execute(dto);
  }

  @Post(":id/reset-password")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Resource(Employee, "id")
  @CheckPolicy(EmployeePolicies.resetPassword)
  @AuditLog({ action: "employee_reset_password", entity: "employee" })
  @ApiOperation({ summary: "Reset employee password to default value" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        username: { type: "string" },
        password: { type: "null", nullable: true, deprecated: true },
        temporaryPasswordIssued: { type: "boolean" },
        resetRequired: { type: "boolean" },
      },
    },
  })
  resetPassword(@Param("id") id: string) {
    return this.resetEmployeePassword.execute(id);
  }
}
