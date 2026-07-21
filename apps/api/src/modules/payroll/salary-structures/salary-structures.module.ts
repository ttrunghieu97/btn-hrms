import { Module } from "@nestjs/common";
import { SalaryStructuresController } from "./salary-structures.controller";
import { SalaryStructuresRepository } from "./repositories/salary-structures.repository";
import {
  GetSalaryStructureUseCase,
  ListSalaryStructuresUseCase,
  UpsertSalaryStructureUseCase,
} from "./use-cases/salary-structures.usecases";

@Module({
  controllers: [SalaryStructuresController],
  providers: [
    SalaryStructuresRepository,
    ListSalaryStructuresUseCase,
    GetSalaryStructureUseCase,
    UpsertSalaryStructureUseCase,
  ],
})
export class SalaryStructuresModule {}



