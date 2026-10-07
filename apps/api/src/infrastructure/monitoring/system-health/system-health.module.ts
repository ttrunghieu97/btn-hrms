import { Module } from "@nestjs/common";
import { SystemHealthController } from "./system-health.controller";
import { GetSystemHealthUseCase } from "./use-cases/get-system-health.usecase";
import { StorageModule } from "../../../infrastructure/storage/storage.module";
import { SystemHealthRepository } from "./repositories/system-health.repository";

@Module({
  imports: [StorageModule],
  controllers: [SystemHealthController],
  providers: [SystemHealthRepository, GetSystemHealthUseCase],
})
export class SystemHealthModule {}
