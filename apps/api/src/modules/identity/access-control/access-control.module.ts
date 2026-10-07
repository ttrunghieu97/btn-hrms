import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { AccessControlController } from "./access-control.controller";
import { UsersRepository } from "../users/repositories/users.repository";
import { PermissionsRepository } from "../permissions/repositories/permissions.repository";
import { AuthRepository } from "../auth/repositories/auth.repository";
import { GetUserPermissionsUseCase } from "./use-cases/get-user-permissions.usecase";
import { UpdateUserPermissionsUseCase } from "./use-cases/update-user-permissions.usecase";
import { UpdateUserAccessControlUseCase } from "./use-cases/update-user-access-control.usecase";
import { RevokeUserSessionsUseCase } from "./use-cases/revoke-user-sessions.usecase";
import { AssignDefaultEmployeeRoleUseCase } from "./use-cases/assign-default-employee-role.usecase";
import { CreateAccessGrantUseCase } from "./use-cases/create-access-grant.usecase";
import { EmployeeCreatedHandler } from "./handlers/employee-created.handler";
import { EmployeeIdentityLifecycleHandler } from "./handlers/employee-lifecycle.handler";
import { AccessControlRepository } from "./repositories/access-control.repository";

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [AccessControlController],
  providers: [
    UsersRepository,
    PermissionsRepository,
    AuthRepository,
    AccessControlRepository,
    GetUserPermissionsUseCase,
    UpdateUserPermissionsUseCase,
    UpdateUserAccessControlUseCase,
    RevokeUserSessionsUseCase,
    AssignDefaultEmployeeRoleUseCase,
    CreateAccessGrantUseCase,
    EmployeeCreatedHandler,
    EmployeeIdentityLifecycleHandler,
  ],
  exports: [AssignDefaultEmployeeRoleUseCase],
})
export class AccessControlModule {}
