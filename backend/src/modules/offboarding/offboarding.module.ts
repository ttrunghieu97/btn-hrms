import { Module } from "@nestjs/common";
import { BoardingModule } from "../onboarding/boarding.module";
import { BoardingProcessReaderAdapter } from "../../contracts/adapters/boarding-process-reader.adapter";
import { BOARDING_PROCESS_READER_PORT } from "../../contracts/ports/boarding-process-reader.port";
import { ContractsModule } from "../../contracts/contracts.module";
import { OffboardingRepository } from "./repositories/offboarding.repository";
import { StartOffboardingUseCase } from "./use-cases/start-offboarding.usecase";
import { ListOffboardingsUseCase } from "./use-cases/list-offboardings.usecase";
import { GetOffboardingUseCase } from "./use-cases/get-offboarding.usecase";
import { CompleteChecklistItemUseCase } from "./use-cases/complete-checklist-item.usecase";
import { ScheduleExitInterviewUseCase } from "./use-cases/schedule-exit-interview.usecase";
import { RecordExitInterviewUseCase } from "./use-cases/record-exit-interview.usecase";
import { DecideClearanceUseCase } from "./use-cases/decide-clearance.usecase";
import { CompleteProcessUseCase } from "./use-cases/complete-process.usecase";
import { OffboardingController } from "./offboarding.controller";
import { OffboardingEmployeeTerminatedSubscriber } from "./subscribers/employee-terminated.subscriber";

@Module({
  imports: [BoardingModule, ContractsModule],
  controllers: [OffboardingController],
  providers: [
    OffboardingRepository,
    {
      provide: BOARDING_PROCESS_READER_PORT,
      useClass: BoardingProcessReaderAdapter,
    },
    StartOffboardingUseCase,
    ListOffboardingsUseCase,
    GetOffboardingUseCase,
    CompleteChecklistItemUseCase,
    ScheduleExitInterviewUseCase,
    RecordExitInterviewUseCase,
    DecideClearanceUseCase,
    CompleteProcessUseCase,
    OffboardingEmployeeTerminatedSubscriber,
  ],
  exports: [
    OffboardingRepository,
    BOARDING_PROCESS_READER_PORT,
    StartOffboardingUseCase,
    ListOffboardingsUseCase,
    GetOffboardingUseCase,
    CompleteChecklistItemUseCase,
    ScheduleExitInterviewUseCase,
    RecordExitInterviewUseCase,
    DecideClearanceUseCase,
    CompleteProcessUseCase,
  ],
})
export class OffboardingModule {}
