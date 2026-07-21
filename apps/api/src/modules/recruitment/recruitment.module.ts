import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { RequisitionsModule } from "./requisitions/requisitions.module";
import { PostingsModule } from "./postings/postings.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { PipelineModule } from "./pipeline/pipeline.module";
import { OffersModule } from "./offers/offers.module";
import { InterviewsModule } from "./interviews/interviews.module";

@Module({
  imports: [
    RequisitionsModule,
    PostingsModule,
    CandidatesModule,
    PipelineModule,
    OffersModule,
    InterviewsModule,
    RouterModule.register([
      { path: "recruitment/requisitions", module: RequisitionsModule },
      { path: "recruitment/postings", module: PostingsModule },
      { path: "recruitment", module: CandidatesModule },
      { path: "recruitment", module: PipelineModule },
      { path: "recruitment/offers", module: OffersModule },
      { path: "recruitment/interviews", module: InterviewsModule },
    ]),
  ],
  exports: [
    RequisitionsModule,
    PostingsModule,
    CandidatesModule,
    PipelineModule,
    OffersModule,
    InterviewsModule,
    InterviewsModule,
  ],
})
export class RecruitmentDomainModule {}
