import { Module } from "@nestjs/common";
import { AttendanceSummariesController } from "./attendance-summaries.controller";
import { AttendanceSummariesRepository } from "./repositories/attendance-summaries.repository";
import { AttendanceSummaryReadService } from "./read-model/attendance-summary-read.service";
import {
  GetAttendanceSummaryUseCase,
  ListAttendanceSummariesUseCase,
} from "./use-cases/attendance-summaries.usecases";

@Module({
  controllers: [AttendanceSummariesController],
  providers: [
    AttendanceSummariesRepository,
    AttendanceSummaryReadService,
    ListAttendanceSummariesUseCase,
    GetAttendanceSummaryUseCase,
  ],
  exports: [
    AttendanceSummariesRepository,
    AttendanceSummaryReadService,
    ListAttendanceSummariesUseCase,
    GetAttendanceSummaryUseCase,
  ],
})
export class AttendanceSummariesModule {}



