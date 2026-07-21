import { Module } from "@nestjs/common";
import { RequisitionsController } from "./requisitions.controller";
import { RequisitionsRepository } from "./repositories/requisitions.repository";
import { CreateRequisitionUseCase } from "./use-cases/create-requisition.usecase";
import { UpdateRequisitionUseCase } from "./use-cases/update-requisition.usecase";
import { SubmitRequisitionUseCase } from "./use-cases/submit-requisition.usecase";
import { CloseRequisitionUseCase } from "./use-cases/close-requisition.usecase";
import { GetRequisitionUseCase } from "./use-cases/get-requisition.usecase";
import { ListRequisitionsUseCase } from "./use-cases/list-requisitions.usecase";

@Module({
  controllers: [RequisitionsController],
  providers: [
    RequisitionsRepository,
    CreateRequisitionUseCase,
    UpdateRequisitionUseCase,
    SubmitRequisitionUseCase,
    CloseRequisitionUseCase,
    GetRequisitionUseCase,
    ListRequisitionsUseCase,
  ],
  exports: [RequisitionsRepository],
})
export class RequisitionsModule {}
