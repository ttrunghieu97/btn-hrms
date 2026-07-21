import { Global, Module } from "@nestjs/common";
import { CONTRACTS_TOKENS } from "./contracts.tokens";
import { WorkforceIdentityAclImpl } from "./acls/implementations/workforce-identity.acl.impl";
import { PayrollInputAclImpl } from "./acls/implementations/payroll-input.acl.impl";
import { DepartmentReaderAdapter } from "./adapters/department-reader.adapter";
import { EmployeeShiftReaderAdapter } from "./adapters/employee-shift-reader.adapter";
import { FakeAttendanceAssignmentAdapter } from "./adapters/attendance-assignment-reader.adapter";
import { WorkforceTimeManagementAdapter } from "./adapters/workforce-time-management.adapter";
import { TimeManagementPayrollAdapter } from "./adapters/time-management-payroll.adapter";
import { WorkflowContextActionAdapter } from "./adapters/workflow-context-action.adapter";

import { AttendanceSummariesReaderAdapter } from "./adapters/attendance-summaries-reader.adapter";
import { ATTENDANCE_SUMMARIES_READER } from "./ports/attendance-summaries-reader.port";
import { AuditLogAdapter } from "./adapters/audit-log.adapter";
import { AuditLogsModule } from "../modules/analytics/audit-logs/audit-logs.module";
import { BoardingModule } from "../modules/onboarding/boarding.module";
import { EmployeeReaderAdapter } from "./adapters/employee-reader.adapter";
import { EMPLOYEE_READER_PORT } from "./ports/employee-reader.port";
import { ATTENDANCE_ASSIGNMENT_READER_PORT } from "./ports/attendance-assignment-reader.port";
import { RECONCILIATION_ATTENDANCE_READER_PORT } from "./ports/reconciliation-attendance-reader.port";
import { ReconciliationAttendanceReaderAdapter } from "./adapters/reconciliation-attendance-reader.adapter";
import { LocationReaderAdapter } from "./adapters/location-reader.adapter";
import { AttendanceReadAdapter } from "./adapters/attendance-read.adapter";
import { ATTENDANCE_READ_PORT } from "./ports/attendance-read.port";
import { AttendancePayPolicyImpl } from "../modules/attendance/timekeeping/policies/attendance-pay.policy";
import { ATTENDANCE_PAY_POLICY } from "./ports/attendance-pay-policy.port";
import { LEAVE_READER_PORT } from "./ports/leave-reader.port";
import { LeaveReaderAdapter } from "./adapters/leave-reader.adapter";
import { PAYROLL_PERIOD_READER_PORT } from "./ports/payroll-period-reader.port";
import { PayrollPeriodReaderAdapter } from "./adapters/payroll-period-reader.adapter";
import { ATTENDANCE_SUMMARY_WRITER_PORT } from "./ports/attendance-summary-writer.port";
import { AttendanceSummaryWriterAdapter } from "./adapters/attendance-summary-writer.adapter";
import { SETTLEMENT_STATUS_WRITER_PORT } from "./ports/settlement-status-writer.port";
import { SettlementStatusWriterAdapter } from "./adapters/settlement-status-writer.adapter";

import { LOCATION_READER_PORT } from "./ports/location-reader.port";
import { AttendanceSummariesModule } from "../modules/attendance/attendance-summaries/attendance-summaries.module";
import { EmployeesModule } from "../modules/workforce/employees/employees.module";
import { LocationsModule } from "../modules/organization/locations/locations.module";
import { AuthModule } from "../modules/identity/auth/auth.module";
import { IdentityAdminAdapter } from "./adapters/identity-admin.adapter";
import { PositionReaderAdapter } from "./adapters/position-reader.adapter";
import { PositionsModule } from "../modules/organization/positions/positions.module";
import { DepartmentsModule } from "../modules/organization/departments/departments.module";
import { WorkforceShiftsModule } from "../modules/scheduling/shifts/workforce-shifts.module";

@Global()
@Module({
  imports: [
    AuditLogsModule,
    AttendanceSummariesModule,
    AuthModule,
    DepartmentsModule,
    EmployeesModule,
    LocationsModule,
    PositionsModule,
    WorkforceShiftsModule,
  ],
  providers: [
    {
      provide: ATTENDANCE_SUMMARIES_READER,
      useClass: AttendanceSummariesReaderAdapter,
    },
    {
      provide: CONTRACTS_TOKENS.WORKFORCE_IDENTITY_ACL,
      useClass: WorkforceIdentityAclImpl,
    },
    {
      provide: CONTRACTS_TOKENS.PAYROLL_INPUT_ACL,
      useClass: PayrollInputAclImpl,
    },
    {
      provide: CONTRACTS_TOKENS.WORKFORCE_TIME_MANAGEMENT_PORT,
      useClass: WorkforceTimeManagementAdapter,
    },
    {
      provide: CONTRACTS_TOKENS.TIME_MANAGEMENT_PAYROLL_PORT,
      useClass: TimeManagementPayrollAdapter,
    },
    {
      provide: CONTRACTS_TOKENS.WORKFLOW_CONTEXT_ACTION_PORT,
      useClass: WorkflowContextActionAdapter,
    },
    {
      provide: CONTRACTS_TOKENS.AUDIT_LOG_PORT,
      useClass: AuditLogAdapter,
    },
    {
      provide: EMPLOYEE_READER_PORT,
      useClass: EmployeeReaderAdapter,
    },
    {
      provide: LOCATION_READER_PORT,
      useClass: LocationReaderAdapter,
    },
    {
      provide: CONTRACTS_TOKENS.IDENTITY_ADMIN_PORT,
      useClass: IdentityAdminAdapter,
    },
    {
      provide: CONTRACTS_TOKENS.POSITION_READER_PORT,
      useClass: PositionReaderAdapter,
    },
    {
      provide: CONTRACTS_TOKENS.DEPARTMENT_READER_PORT,
      useClass: DepartmentReaderAdapter,
    },
    {
      provide: CONTRACTS_TOKENS.EMPLOYEE_SHIFT_READER_PORT,
      useClass: EmployeeShiftReaderAdapter,
    },
    {
      provide: ATTENDANCE_ASSIGNMENT_READER_PORT,
      useClass: FakeAttendanceAssignmentAdapter,
    },
    {
      provide: RECONCILIATION_ATTENDANCE_READER_PORT,
      useClass: ReconciliationAttendanceReaderAdapter,
    },
    {
      provide: CONTRACTS_TOKENS.ATTENDANCE_READ_PORT,
      useClass: AttendanceReadAdapter,
    },
    {
      provide: ATTENDANCE_PAY_POLICY,
      useClass: AttendancePayPolicyImpl,
    },
    {
      provide: PAYROLL_PERIOD_READER_PORT,
      useClass: PayrollPeriodReaderAdapter,
    },
    {
      provide: LEAVE_READER_PORT,
      useClass: LeaveReaderAdapter,
    },
    {
      provide: ATTENDANCE_SUMMARY_WRITER_PORT,
      useClass: AttendanceSummaryWriterAdapter,
    },
    {
      provide: SETTLEMENT_STATUS_WRITER_PORT,
      useClass: SettlementStatusWriterAdapter,
    },
  ],
  exports: [
    ATTENDANCE_SUMMARIES_READER,
    CONTRACTS_TOKENS.WORKFORCE_IDENTITY_ACL,
    CONTRACTS_TOKENS.PAYROLL_INPUT_ACL,
    CONTRACTS_TOKENS.WORKFORCE_TIME_MANAGEMENT_PORT,
    CONTRACTS_TOKENS.TIME_MANAGEMENT_PAYROLL_PORT,
    CONTRACTS_TOKENS.WORKFLOW_CONTEXT_ACTION_PORT,
    CONTRACTS_TOKENS.AUDIT_LOG_PORT,
    CONTRACTS_TOKENS.IDENTITY_ADMIN_PORT,
    CONTRACTS_TOKENS.POSITION_READER_PORT,
    CONTRACTS_TOKENS.DEPARTMENT_READER_PORT,
    CONTRACTS_TOKENS.EMPLOYEE_SHIFT_READER_PORT,
    ATTENDANCE_ASSIGNMENT_READER_PORT,
    RECONCILIATION_ATTENDANCE_READER_PORT,
    EMPLOYEE_READER_PORT,
    LOCATION_READER_PORT,
    CONTRACTS_TOKENS.ATTENDANCE_READ_PORT,
    ATTENDANCE_PAY_POLICY,
    PAYROLL_PERIOD_READER_PORT,
    LEAVE_READER_PORT,
    ATTENDANCE_SUMMARY_WRITER_PORT,
    SETTLEMENT_STATUS_WRITER_PORT,
  ],
})
export class ContractsModule {}
