import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ListPermissionsUseCase } from "./use-cases/list-permissions.usecase";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { UserPolicies } from "../../../core/security/policies/user.policy";

@ApiTags("Permissions")
@ApiBearerAuth()
@Controller()
export class PermissionsController {
  constructor(private readonly listPermissions: ListPermissionsUseCase) {}

  @Get()
  @CheckPolicy(UserPolicies.managePermissions)
  @ApiOperation({ summary: "List permissions" })
  async findAll() {
    return this.listPermissions.execute();
  }
}
