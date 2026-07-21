import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesController } from './roles.controller';
import { RolesRepository } from './roles.repository';
import { AuthRepository } from '../auth/repositories/auth.repository';
import { PermissionsModule } from '../permissions/permissions.module';
import { ListRolesUseCase } from './use-cases/list-roles.usecase';
import { GetRoleUseCase } from './use-cases/get-role.usecase';
import { CreateRoleUseCase } from './use-cases/create-role.usecase';
import { UpdateRoleUseCase } from './use-cases/update-role.usecase';
import { DeleteRoleUseCase } from './use-cases/delete-role.usecase';

@Module({
  imports: [PermissionsModule, AuthModule],
  controllers: [RolesController],
  providers: [
    RolesRepository,
    AuthRepository,
    ListRolesUseCase,
    GetRoleUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
  ],
  exports: [RolesRepository],
})
export class RolesModule {}
