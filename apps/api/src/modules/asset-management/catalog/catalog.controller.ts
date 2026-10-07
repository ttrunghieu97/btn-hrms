import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { AssetPolicies } from "../../../core/security/policies/asset.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { CreateAssetTypeDto } from "./dto/create-asset-type.dto";
import { UpdateAssetTypeDto } from "./dto/update-asset-type.dto";
import { AssetTypeQueryDto } from "./dto/asset-type-query.dto";
import { RegisterAssetDto } from "./dto/register-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { AssetQueryDto } from "./dto/asset-query.dto";
import { ChangeAssetStatusDto } from "./dto/change-asset-status.dto";
import { CreateAssetTypeUseCase } from "./use-cases/create-asset-type.usecase";
import { UpdateAssetTypeUseCase } from "./use-cases/update-asset-type.usecase";
import { RetireAssetTypeUseCase } from "./use-cases/retire-asset-type.usecase";
import { ListAssetTypesUseCase } from "./use-cases/list-asset-types.usecase";
import { RegisterAssetUseCase } from "./use-cases/register-asset.usecase";
import { UpdateAssetUseCase } from "./use-cases/update-asset.usecase";
import { ListAssetsUseCase } from "./use-cases/list-assets.usecase";
import { ChangeAssetStatusUseCase } from "./use-cases/change-asset-status.usecase";

@ApiTags("Asset Catalog")
@ApiBearerAuth()
@Controller()
export class AssetCatalogController {
  constructor(
    private readonly listAssetTypes: ListAssetTypesUseCase,
    private readonly createAssetType: CreateAssetTypeUseCase,
    private readonly updateAssetType: UpdateAssetTypeUseCase,
    private readonly retireAssetType: RetireAssetTypeUseCase,
    private readonly listAssets: ListAssetsUseCase,
    private readonly registerAsset: RegisterAssetUseCase,
    private readonly updateAsset: UpdateAssetUseCase,
    private readonly changeAssetStatus: ChangeAssetStatusUseCase,
  ) {}

  // ─── Asset types ──────────────────────────────────────────────────

  @Get()
  @CheckPolicy(AssetPolicies.view)
  @ApiOperation({ summary: "List asset types" })
  list(@Query() query: AssetTypeQueryDto) {
    return this.listAssetTypes.execute(query);
  }

  @Post()
  @CheckPolicy(AssetPolicies.manageCatalog)
  @AuditLog({ action: "asset_type_create", entity: "asset_type" })
  @ApiOperation({ summary: "Create an asset type" })
  create(@Body() dto: CreateAssetTypeDto) {
    return this.createAssetType.execute(dto);
  }

  @Patch(":id")
  @CheckPolicy(AssetPolicies.manageCatalog)
  @AuditLog({ action: "asset_type_update", entity: "asset_type" })
  @ApiOperation({ summary: "Update an asset type" })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAssetTypeDto,
  ) {
    return this.updateAssetType.execute(id, dto);
  }

  @Post(":id/retire")
  @CheckPolicy(AssetPolicies.manageCatalog)
  @AuditLog({ action: "asset_type_retire", entity: "asset_type" })
  @ApiOperation({ summary: "Retire (soft-delete) an asset type" })
  retire(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.retireAssetType.execute(id);
  }

  // ─── Assets ───────────────────────────────────────────────────────

  @Get("assets")
  @CheckPolicy(AssetPolicies.view)
  @ApiOperation({ summary: "List serialized assets" })
  listAssetUnits(@Query() query: AssetQueryDto) {
    return this.listAssets.execute(query);
  }

  @Post("assets")
  @CheckPolicy(AssetPolicies.manageCatalog)
  @AuditLog({ action: "asset_register", entity: "asset" })
  @ApiOperation({ summary: "Register a serialized asset" })
  register(@Body() dto: RegisterAssetDto) {
    return this.registerAsset.execute(dto);
  }

  @Patch("assets/:id")
  @CheckPolicy(AssetPolicies.manageCatalog)
  @AuditLog({ action: "asset_update", entity: "asset" })
  @ApiOperation({ summary: "Update a serialized asset" })
  updateAssetUnit(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.updateAsset.execute(id, dto);
  }

  @Post("assets/:id/status")
  @CheckPolicy(AssetPolicies.manageCatalog)
  @AuditLog({ action: "asset_status_change", entity: "asset" })
  @ApiOperation({ summary: "Change a serialized asset's status" })
  changeStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeAssetStatusDto,
  ) {
    return this.changeAssetStatus.execute(id, dto);
  }
}
