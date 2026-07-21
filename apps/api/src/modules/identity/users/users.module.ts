import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { PermissionsModule } from "../permissions/permissions.module";
import { AuthModule } from "../auth/auth.module";
import { UsersRepository } from "./repositories/users.repository";
import { ListUsersUseCase } from "./use-cases/list-users.usecase";
import { GetUserByIdUseCase } from "./use-cases/get-user-by-id.usecase";
import { GetUserByUsernameUseCase } from "./use-cases/get-user-by-username.usecase";
import { GetUserByEmailUseCase } from "./use-cases/get-user-by-email.usecase";
import { GetCurrentUserProfileUseCase } from "./use-cases/get-current-user-profile.usecase";
import { GetUserSecurityUseCase } from "./use-cases/get-user-security.usecase";

@Module({
  imports: [PermissionsModule, AuthModule],
  controllers: [UsersController],
  providers: [
    UsersRepository,
    ListUsersUseCase,
    GetUserByIdUseCase,
    GetUserByUsernameUseCase,
    GetUserByEmailUseCase,
    GetCurrentUserProfileUseCase,
    GetUserSecurityUseCase,
  ],
  exports: [
    UsersRepository,
    GetUserByIdUseCase,
    GetUserByUsernameUseCase,
    GetUserByEmailUseCase,
  ],
})
export class UsersModule {}
