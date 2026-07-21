import { Module } from "@nestjs/common";
import { CandidatesModule } from "../candidates/candidates.module";
import { PipelineController } from "./pipeline.controller";
import { AdvanceStageUseCase } from "./use-cases/advance-stage.usecase";
import { CloseApplicationUseCase } from "./use-cases/close-application.usecase";
import { RejectApplicationUseCase } from "./use-cases/reject-application.usecase";
import { WithdrawApplicationUseCase } from "./use-cases/withdraw-application.usecase";
import { SubmitScorecardUseCase } from "./use-cases/submit-scorecard.usecase";

@Module({
  // CandidatesModule exports ApplicationsRepository — the shared repo is
  // provided there, not re-provided here.
  imports: [CandidatesModule],
  controllers: [PipelineController],
  providers: [
    AdvanceStageUseCase,
    CloseApplicationUseCase,
    RejectApplicationUseCase,
    WithdrawApplicationUseCase,
    SubmitScorecardUseCase,
  ],
})
export class PipelineModule {}
