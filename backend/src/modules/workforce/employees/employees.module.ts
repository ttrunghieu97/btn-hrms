import { Module } from "@nestjs/common";
import { EmployeesController } from "./employees.controller";
import { EmployeeAdminController } from "./employee-admin.controller";
import { DepartmentEmployeesController } from "./department-employees.controller";
import { EmployeesRepository } from "./repositories/employees.repository";
import { EmployeeDocumentRepository } from "./repositories/employee-document.repository";
import { EmployeeCertificationRepository } from "./repositories/employee-certification.repository";
import { StorageDomainModule } from "../../storage/storage.module";
import { SecurityModule } from "../../../infrastructure/security/security.module";
import { ListEmployeesUseCase } from "./use-cases/list-employees.usecase";
import { GetEmployeeUseCase } from "./use-cases/get-employee.usecase";
import { GetEmployeeByUserUseCase } from "./use-cases/get-employee-by-user.usecase";
import { CreateEmployeeUseCase } from "./use-cases/create-employee.usecase";
import { UpdateEmployeeUseCase } from "./use-cases/update-employee.usecase";
import { DeleteEmployeeUseCase } from "./use-cases/delete-employee.usecase";
import { RestoreEmployeeUseCase } from "./use-cases/restore-employee.usecase";
import { PurgeEmployeeUseCase } from "./use-cases/purge-employee.usecase";
import { CheckUsernameUseCase } from "./use-cases/check-username.usecase";
import { CheckEmployeeCodeUseCase } from "./use-cases/check-employee-code.usecase";
import { ResetEmployeePasswordUseCase } from "./use-cases/reset-employee-password.usecase";
import { ChangeEmployeeStatusUseCase } from "./use-cases/change-employee-status.usecase";
import { ListEmployeeStatusHistoryUseCase } from "./use-cases/list-employee-status-history.usecase";
import { ScheduleTerminationUseCase } from "./use-cases/schedule-termination.usecase";
import { TerminationSchedulerJob } from "./jobs/termination-scheduler.job";
import { CancelScheduledTerminationUseCase } from "./use-cases/cancel-scheduled-termination.usecase";
import { ExecuteScheduledTerminationsUseCase } from "./use-cases/execute-scheduled-terminations.usecase";
import { RestoreArchivedEmployeeUseCase } from "./use-cases/restore-archived-employee.usecase";
import { RehireEmployeeUseCase } from "./use-cases/rehire-employee.usecase";
import { RequestTransferUseCase } from "./use-cases/request-transfer.usecase";
import { ApproveTransferUseCase } from "./use-cases/approve-transfer.usecase";
import { RejectTransferUseCase } from "./use-cases/reject-transfer.usecase";
import { ApplyTransferUseCase } from "./use-cases/apply-transfer.usecase";
import { CancelTransferUseCase } from "./use-cases/cancel-transfer.usecase";
import { BulkChangeStatusUseCase } from "./use-cases/bulk-change-status.usecase";
import { BulkArchiveUseCase } from "./use-cases/bulk-archive.usecase";import { TerminateEmployeeUseCase } from "../application/use-cases/terminate-employee.usecase";
import { EmployeeEducationController } from "./employee-education.controller";
import { EmployeeEducationRepository } from "./repositories/employee-education.repository";
import { EducationAggregationService } from "./services/education-aggregation.service";
import { AddEducationUseCase } from "./use-cases/add-education.usecase";
import { UpdateEducationUseCase } from "./use-cases/update-education.usecase";
import { DeleteEducationUseCase } from "./use-cases/delete-education.usecase";
import { ListEducationsUseCase } from "./use-cases/list-educations.usecase";
import { EmployeeContractsModule } from "../employee-contracts/employee-contracts.module";
import { AccessControlModule } from "../../identity/access-control/access-control.module";
import { ResolveEmployeeAttachmentPlanService } from "./services/resolve-employee-attachment-plan.service";
import { ApplyEmployeeAttachmentPlanService } from "./services/apply-employee-attachment-plan.service";
import { EmployeeLifecycleService } from "./services/employee-lifecycle.service";
import { PlatformWorkflowEngineDomainModule } from "../../platform-workflow-engine/platform-workflow-engine.module";

@Module({
  controllers: [EmployeesController, EmployeeAdminController, DepartmentEmployeesController, EmployeeEducationController],
  imports: [StorageDomainModule, SecurityModule, AccessControlModule, EmployeeContractsModule, PlatformWorkflowEngineDomainModule],
  providers: [
    EmployeesRepository,
    EmployeeDocumentRepository,
    EmployeeCertificationRepository,
    ListEmployeesUseCase,
    GetEmployeeUseCase,
    GetEmployeeByUserUseCase,
    CreateEmployeeUseCase,
    ResolveEmployeeAttachmentPlanService,
    ApplyEmployeeAttachmentPlanService,
    EmployeeLifecycleService,
    CheckUsernameUseCase,
    CheckEmployeeCodeUseCase,
    UpdateEmployeeUseCase,
    DeleteEmployeeUseCase,
    ScheduleTerminationUseCase,
    CancelScheduledTerminationUseCase,
    ExecuteScheduledTerminationsUseCase,    TerminationSchedulerJob,
    RestoreArchivedEmployeeUseCase,
    RehireEmployeeUseCase,
    RequestTransferUseCase,
    ApproveTransferUseCase,
    RejectTransferUseCase,
    ApplyTransferUseCase,
    CancelTransferUseCase,
    BulkChangeStatusUseCase,
    BulkArchiveUseCase,
    RestoreEmployeeUseCase,
    PurgeEmployeeUseCase,
    ResetEmployeePasswordUseCase,
    ChangeEmployeeStatusUseCase,
    ListEmployeeStatusHistoryUseCase,
    TerminateEmployeeUseCase,
    EmployeeEducationRepository,
    EducationAggregationService,
    AddEducationUseCase,
    UpdateEducationUseCase,
    DeleteEducationUseCase,
    ListEducationsUseCase,
  ],
  exports: [
    EmployeesRepository,
    EmployeeDocumentRepository,
    EmployeeCertificationRepository,
    ListEmployeesUseCase,
    GetEmployeeUseCase,
    GetEmployeeByUserUseCase,
    EmployeeEducationRepository,
    AddEducationUseCase,
    UpdateEducationUseCase,
    DeleteEducationUseCase,
    ListEducationsUseCase,
  ],
})
export class EmployeesModule {}

