import { Module } from "@nestjs/common";
import { PositionsController } from "./positions.controller";
import { PositionsRepository } from "./repositories/positions.repository";
import { ListPositionsUseCase } from "./use-cases/list-positions.usecase";
import { CreatePositionUseCase } from "./use-cases/create-position.usecase";
import { UpdatePositionUseCase } from "./use-cases/update-position.usecase";
import { DeletePositionUseCase } from "./use-cases/delete-position.usecase";

@Module({
  controllers: [PositionsController],
  providers: [
    PositionsRepository,
    ListPositionsUseCase,
    CreatePositionUseCase,
    UpdatePositionUseCase,
    DeletePositionUseCase,
  ],
  exports: [
    PositionsRepository,
    ListPositionsUseCase,
    CreatePositionUseCase,
    UpdatePositionUseCase,
    DeletePositionUseCase,
  ],
})
export class PositionsModule {}

