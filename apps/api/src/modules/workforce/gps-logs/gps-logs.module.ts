import { Module } from "@nestjs/common";
import { GPSLogsController } from "./gps-logs.controller";
import { GPSLogsRepository } from "./repositories/gps-logs.repository";
import { CreateGPSLogUseCase } from "./use-cases/create-gps-log.usecase";
import { ListGPSLogsUseCase } from "./use-cases/list-gps-logs.usecase";
import { CreateGPSLogForCurrentUserUseCase } from "./use-cases/create-gps-log-for-current-user.usecase";
import { EmployeesModule } from "../employees/employees.module";

@Module({
  imports: [EmployeesModule],
  controllers: [GPSLogsController],
  providers: [
    GPSLogsRepository,
    CreateGPSLogUseCase,
    CreateGPSLogForCurrentUserUseCase,
    ListGPSLogsUseCase,
  ],
  exports: [GPSLogsRepository, CreateGPSLogUseCase, ListGPSLogsUseCase],
})
export class GPSLogsModule {}

