import { Module } from "@nestjs/common";
import { StorageModule } from "../../../infrastructure/storage/storage.module";
import { CandidatesController } from "./candidates.controller";
import { ApplicationsRepository } from "./repositories/applications.repository";
import { SubmitApplicationUseCase } from "./use-cases/submit-application.usecase";
import { AttachCvUseCase } from "./use-cases/attach-cv.usecase";
import { GetCandidateApplicationUseCase } from "./use-cases/get-candidate-application.usecase";
import { ListApplicationsUseCase } from "./use-cases/list-applications.usecase";

@Module({
  // StorageModule is NOT @Global; AttachCvUseCase depends on StorageService,
  // so it must be imported explicitly here.
  imports: [StorageModule],
  controllers: [CandidatesController],
  providers: [
    ApplicationsRepository,
    SubmitApplicationUseCase,
    AttachCvUseCase,
    GetCandidateApplicationUseCase,
    ListApplicationsUseCase,
  ],
  exports: [ApplicationsRepository],
})
export class CandidatesModule {}
