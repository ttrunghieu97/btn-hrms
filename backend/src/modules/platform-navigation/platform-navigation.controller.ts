import { Controller, Get, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { NavService } from "./services/nav.service";
import { NavResponseDto } from "./dto/nav-item.dto";
import { CheckPolicy } from "../../core/security/decorators/check-policy.decorator";
import { navPolicies } from "./navigation.policies";

@ApiTags("Platform Navigation")
@ApiBearerAuth()
@Controller()
export class PlatformNavigationController {
  constructor(private readonly navService: NavService) {}

  @Get("nav")
  @CheckPolicy(navPolicies.view)
  @ApiOperation({ summary: "Get navigation tree for current user" })
  @ApiOkResponse({ type: NavResponseDto })
  async getNav(
    @Req() req: { user: { permissions?: string[]; isSuperAdmin?: boolean } },
  ): Promise<NavResponseDto> {
    return this.navService.getNavForUser(req.user);
  }
}
