import { Module } from "@nestjs/common";
import { AssetRequestController } from "./asset-request.controller";
import { AssetRequestRepository } from "./repositories/asset-request.repository";
import { CreateRequestUseCase } from "./use-cases/create-request.usecase";
import { UpdateRequestUseCase } from "./use-cases/update-request.usecase";
import { SubmitRequestUseCase } from "./use-cases/submit-request.usecase";
import { CancelRequestUseCase } from "./use-cases/cancel-request.usecase";
import { GetRequestUseCase } from "./use-cases/get-request.usecase";
import { ListRequestsUseCase } from "./use-cases/list-requests.usecase";

@Module({
  controllers: [AssetRequestController],
  providers: [
    AssetRequestRepository,
    CreateRequestUseCase,
    UpdateRequestUseCase,
    SubmitRequestUseCase,
    CancelRequestUseCase,
    GetRequestUseCase,
    ListRequestsUseCase,
  ],
  exports: [AssetRequestRepository],
})
export class AssetRequestModule {}
