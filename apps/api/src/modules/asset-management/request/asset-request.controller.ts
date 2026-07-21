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
import { CreateRequestDto } from "./dto/create-request.dto";
import { UpdateRequestDto } from "./dto/update-request.dto";
import { RequestQueryDto } from "./dto/request-query.dto";
import { CreateRequestUseCase } from "./use-cases/create-request.usecase";
import { UpdateRequestUseCase } from "./use-cases/update-request.usecase";
import { SubmitRequestUseCase } from "./use-cases/submit-request.usecase";
import { CancelRequestUseCase } from "./use-cases/cancel-request.usecase";
import { GetRequestUseCase } from "./use-cases/get-request.usecase";
import { ListRequestsUseCase } from "./use-cases/list-requests.usecase";

@ApiTags("Asset Requests")
@ApiBearerAuth()
@Controller()
export class AssetRequestController {
  constructor(
    private readonly createRequest: CreateRequestUseCase,
    private readonly updateRequest: UpdateRequestUseCase,
    private readonly submitRequest: SubmitRequestUseCase,
    private readonly cancelRequest: CancelRequestUseCase,
    private readonly getRequest: GetRequestUseCase,
    private readonly listRequests: ListRequestsUseCase,
  ) {}

  @Get()
  @CheckPolicy(AssetPolicies.view)
  @ApiOperation({ summary: "List asset requests" })
  list(@Query() query: RequestQueryDto) {
    return this.listRequests.execute(query);
  }

  @Get(":id")
  @CheckPolicy(AssetPolicies.view)
  @ApiOperation({ summary: "Get an asset request" })
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getRequest.execute(id);
  }

  @Post()
  @CheckPolicy(AssetPolicies.createRequest)
  @AuditLog({ action: "asset_request_create", entity: "asset_request" })
  @ApiOperation({ summary: "Create an asset request" })
  create(@Body() dto: CreateRequestDto) {
    return this.createRequest.execute(dto);
  }

  @Patch(":id")
  @CheckPolicy(AssetPolicies.createRequest)
  @AuditLog({ action: "asset_request_update", entity: "asset_request" })
  @ApiOperation({ summary: "Update a draft asset request" })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRequestDto,
  ) {
    return this.updateRequest.execute(id, dto);
  }

  @Post(":id/submit")
  @CheckPolicy(AssetPolicies.createRequest)
  @AuditLog({ action: "asset_request_submit", entity: "asset_request" })
  @ApiOperation({ summary: "Submit an asset request for approval" })
  submit(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.submitRequest.execute(id);
  }

  @Post(":id/cancel")
  @CheckPolicy(AssetPolicies.createRequest)
  @AuditLog({ action: "asset_request_cancel", entity: "asset_request" })
  @ApiOperation({ summary: "Cancel an asset request" })
  cancel(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.cancelRequest.execute(id);
  }
}
