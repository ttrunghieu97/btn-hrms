import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { AssetPolicies } from "../../../core/security/policies/asset.policy";
import { GetAssetHistoryUseCase } from "./use-cases/get-asset-history.usecase";

@ApiTags("Asset History")
@ApiBearerAuth()
@Controller()
export class AssetHistoryController {
  constructor(private readonly getAssetHistory: GetAssetHistoryUseCase) {}

  @Get("assets/:id/history")
  @CheckPolicy(AssetPolicies.view)
  @ApiOperation({ summary: "Chronological history for an asset" })
  history(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getAssetHistory.execute(id);
  }
}
