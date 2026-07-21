import { Module } from "@nestjs/common";
import { PermissionsController } from "./permissions.controller";
import { PermissionsRepository } from "./repositories/permissions.repository";
import { PermissionCacheService } from "./permission-cache.service";
import { PermissionMatrixService } from "./permission-matrix.service";
import { ListPermissionsUseCase } from "./use-cases/list-permissions.usecase";
import { GetUserPermissionsUseCase } from "./use-cases/get-user-permissions.usecase";
import { CONTRACTS_TOKENS } from "../../../contracts/contracts.tokens";
import { PermissionReaderAdapter } from "./adapters/permission-reader.adapter";

@Module({
  controllers: [PermissionsController],
  providers: [
    PermissionsRepository,
    PermissionCacheService,
    PermissionMatrixService,
    ListPermissionsUseCase,
    GetUserPermissionsUseCase,
    {
      provide: CONTRACTS_TOKENS.PERMISSION_READER_PORT,
      useClass: PermissionReaderAdapter,
    },
  ],
  exports: [
    PermissionsRepository,
    PermissionCacheService,
    PermissionMatrixService,
    GetUserPermissionsUseCase,
    CONTRACTS_TOKENS.PERMISSION_READER_PORT,
  ],
})
export class PermissionsModule {}
