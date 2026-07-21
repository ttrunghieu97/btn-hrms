import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { AssetPolicies } from "../../../core/security/policies/asset.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { ReceiveStockDto } from "./dto/receive-stock.dto";
import { AdjustStockDto } from "./dto/adjust-stock.dto";
import { ListStockLevelsUseCase } from "./use-cases/list-stock-levels.usecase";
import { GetStockLevelUseCase } from "./use-cases/get-stock-level.usecase";
import { ReceiveStockUseCase } from "./use-cases/receive-stock.usecase";
import { AdjustStockUseCase } from "./use-cases/adjust-stock.usecase";

@ApiTags("Asset Inventory")
@ApiBearerAuth()
@Controller()
export class AssetInventoryController {
  constructor(
    private readonly listStockLevels: ListStockLevelsUseCase,
    private readonly getStockLevel: GetStockLevelUseCase,
    private readonly receiveStock: ReceiveStockUseCase,
    private readonly adjustStock: AdjustStockUseCase,
  ) {}

  @Get()
  @CheckPolicy(AssetPolicies.view)
  @ApiOperation({ summary: "List stock levels" })
  list() {
    return this.listStockLevels.execute();
  }

  @Get(":assetTypeId")
  @CheckPolicy(AssetPolicies.view)
  @ApiOperation({ summary: "Get stock level for an asset type" })
  get(@Param("assetTypeId", new ParseUUIDPipe()) assetTypeId: string) {
    return this.getStockLevel.execute(assetTypeId);
  }

  @Post("receive")
  @CheckPolicy(AssetPolicies.manageInventory)
  @AuditLog({ action: "asset_stock_receive", entity: "asset_stock_level" })
  @ApiOperation({ summary: "Receive stock into inventory" })
  receive(@Body() dto: ReceiveStockDto) {
    return this.receiveStock.execute(dto);
  }

  @Post("adjust")
  @CheckPolicy(AssetPolicies.manageInventory)
  @AuditLog({ action: "asset_stock_adjust", entity: "asset_stock_level" })
  @ApiOperation({ summary: "Adjust stock on-hand (+/-)" })
  adjust(@Body() dto: AdjustStockDto) {
    return this.adjustStock.execute(dto);
  }
}
