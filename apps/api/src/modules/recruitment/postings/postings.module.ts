import { Module } from "@nestjs/common";
import { PostingsController } from "./postings.controller";
import { PostingsRepository } from "./repositories/postings.repository";
import { PublishPostingUseCase } from "./use-cases/publish-posting.usecase";
import { UpdatePostingUseCase } from "./use-cases/update-posting.usecase";
import { ChangePostingStatusUseCase } from "./use-cases/change-posting-status.usecase";
import { GetPostingUseCase } from "./use-cases/get-posting.usecase";
import { ListPostingsUseCase } from "./use-cases/list-postings.usecase";

@Module({
  controllers: [PostingsController],
  providers: [
    PostingsRepository,
    PublishPostingUseCase,
    UpdatePostingUseCase,
    ChangePostingStatusUseCase,
    GetPostingUseCase,
    ListPostingsUseCase,
  ],
  exports: [PostingsRepository],
})
export class PostingsModule {}
