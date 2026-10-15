import { Module } from "@nestjs/common";
import { InterviewsController } from "./interviews.controller";
import { InterviewRepository } from "./repositories/interview.repository";
import {
  ScheduleInterviewUseCase, CompleteInterviewUseCase,
  SubmitScorecardUseCase, ListInterviewsUseCase,
} from "./use-cases";
import { CandidatesModule } from "../candidates/candidates.module";

@Module({
  imports: [CandidatesModule],
  controllers: [InterviewsController],
  providers: [
    InterviewRepository,
    ScheduleInterviewUseCase, CompleteInterviewUseCase,
    SubmitScorecardUseCase, ListInterviewsUseCase,
  ],
  exports: [InterviewRepository],
})
export class InterviewsModule {}
