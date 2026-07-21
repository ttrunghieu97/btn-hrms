import { Module } from "@nestjs/common";
import { InterviewRepository } from "./repositories/interview.repository";
import {
  ScheduleInterviewUseCase, CompleteInterviewUseCase,
  SubmitScorecardUseCase, ListInterviewsUseCase,
} from "./use-cases";
import { ApplicationsRepository } from "../candidates/repositories/applications.repository";
import { CandidatesModule } from "../candidates/candidates.module";

@Module({
  imports: [CandidatesModule],
  providers: [
    InterviewRepository,
    ScheduleInterviewUseCase, CompleteInterviewUseCase,
    SubmitScorecardUseCase, ListInterviewsUseCase,
  ],
  exports: [InterviewRepository],
})
export class InterviewsModule {}
