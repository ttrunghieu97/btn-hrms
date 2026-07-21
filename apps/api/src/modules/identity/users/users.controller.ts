import { Controller, Get, Req, Query, Param, ParseUUIDPipe } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { UserQueryRequestDto } from "./dto/user-query.dto";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from "@nestjs/swagger";
import {
  UserListResponseDto,
  UserMeEnvelopeResponseDto,
} from "./dto/user-response.dto";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { UserPolicies } from "../../../core/security/policies/user.policy";
import { ListUsersUseCase } from "./use-cases/list-users.usecase";
import { GetCurrentUserProfileUseCase } from "./use-cases/get-current-user-profile.usecase";
import { GetUserSecurityUseCase } from "./use-cases/get-user-security.usecase";
import { AuthUser } from "../../../core/security/types/auth-user.interface";

@ApiTags("Users Management")
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly getCurrentUserProfile: GetCurrentUserProfileUseCase,
    private readonly getUserSecurity: GetUserSecurityUseCase,
  ) {}

  @Get("me")
  @CheckPolicy(UserPolicies.viewSelf)
  @ApiOperation({ summary: "Get current user profile" })
  @ApiOkResponse({ type: UserMeEnvelopeResponseDto })
  async getMe(@Req() req: { user: AuthUser }) {
    return this.getCurrentUserProfile.execute(req.user.id);
  }

  @Get()
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  @CheckPolicy(UserPolicies.view)
  @ApiOperation({ summary: "List users with filtering and pagination" })
  @ApiOkResponse({ type: UserListResponseDto })
  async findAll(@Query() query: UserQueryRequestDto) {
    return this.listUsers.execute(query);
  }

  @Get(":id/security")
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  @CheckPolicy(UserPolicies.view)
  @ApiOperation({ summary: "Get user security details (login, sessions, password)" })
  async getSecurity(@Param("id", ParseUUIDPipe) id: string) {
    return this.getUserSecurity.execute(id);
  }
}
