import { Module } from "@nestjs/common";
import { WorkforceFacade } from "./providers/workforce.facade";
import { CONTRACTS_TOKENS } from "../../contracts/contracts.tokens";
import { EmployeesRepository } from "./employees/repositories/employees.repository";
import { EmployeeContractsModule } from "./employee-contracts/employee-contracts.module";
import { EmployeeTimelineModule } from "./employee-timeline/employee-timeline.module";
import { EmployeeAllowancesModule } from "./employee-allowances/employee-allowances.module";
import { EmployeeSocialInsuranceModule } from "./employee-social-insurance/employee-social-insurance.module";
import { LaborReportModule } from "./labor-report/labor-report.module";
import { HireEmployeeUseCase } from "./application/use-cases/hire-employee.usecase";
import { GPSLogsModule } from "./gps-logs/gps-logs.module";
import { ContractsModule } from "./contracts/contracts.module";
import { DocumentsModule } from "./documents/documents.module";

@Module({
  imports: [
    GPSLogsModule,
    EmployeeContractsModule,
    EmployeeTimelineModule,
    EmployeeAllowancesModule,
    EmployeeSocialInsuranceModule,
    LaborReportModule,
    ContractsModule,
    DocumentsModule,
  ],
  providers: [
    EmployeesRepository,
    HireEmployeeUseCase,
    {
      provide: CONTRACTS_TOKENS.WORKFORCE_FACADE_PORT,
      useClass: WorkforceFacade,
    },
  ],
  exports: [CONTRACTS_TOKENS.WORKFORCE_FACADE_PORT],
})
export class WorkforceDomainModule {}
