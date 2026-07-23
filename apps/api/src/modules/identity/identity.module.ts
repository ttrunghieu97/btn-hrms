import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { AccessControlModule } from "./access-control/access-control.module";
import { RolesModule } from "./roles/roles.module";

@Module({
  imports: [
    RolesModule,
    AuthModule,
    UsersModule,
    PermissionsModule,
    AccessControlModule,
    RouterModule.register([
      { path: "auth", module: AuthModule },
      { path: "users", module: UsersModule },
      { path: "permissions", module: PermissionsModule },
      { path: "users", module: AccessControlModule },
    ]),
  ],
})
export class IdentityDomainModule {}
