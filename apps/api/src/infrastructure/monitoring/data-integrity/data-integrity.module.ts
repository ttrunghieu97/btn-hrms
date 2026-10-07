import { Module } from "@nestjs/common";
import { DataIntegrityController } from "./data-integrity.controller";
import { GetDataIntegrityUseCase } from "./use-cases/get-data-integrity.usecase";
import { DataIntegrityRepository } from "./repositories/data-integrity.repository";

@Module({
  controllers: [DataIntegrityController],
  providers: [DataIntegrityRepository, GetDataIntegrityUseCase],
})
export class DataIntegrityModule {}
