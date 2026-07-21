import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { AssetPolicies } from "../../../core/security/policies/asset.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { IssueAssetDto } from "./dto/issue-asset.dto";
import { ReturnAssetDto } from "./dto/return-asset.dto";
import { IssueQueryDto } from "./dto/issue-query.dto";
import { IssueAssetUseCase } from "./use-cases/issue-asset.usecase";
import { ReturnAssetUseCase } from "./use-cases/return-asset.usecase";
import { GetIssueUseCase } from "./use-cases/get-issue.usecase";
import { ListIssuesUseCase } from "./use-cases/list-issues.usecase";
import { GetEmployeeHoldingsUseCase } from "./use-cases/get-employee-holdings.usecase";

@ApiTags("Asset Issues")
@ApiBearerAuth()
@Controller()
export class AssetIssueController {
  constructor(
    private readonly issueAsset: IssueAssetUseCase,
    private readonly returnAsset: ReturnAssetUseCase,
    private readonly getIssue: GetIssueUseCase,
    private readonly listIssues: ListIssuesUseCase,
    private readonly getEmployeeHoldings: GetEmployeeHoldingsUseCase,
  ) {}

  @Get()
  @CheckPolicy(AssetPolicies.view)
  @ApiOperation({ summary: "List asset issues" })
  list(@Query() query: IssueQueryDto) {
    return this.listIssues.execute(query);
  }

  @Get("holdings/:employeeId")
  @CheckPolicy(AssetPolicies.view)
  @ApiOperation({ summary: "Current asset holdings for an employee" })
  holdings(@Param("employeeId", new ParseUUIDPipe()) employeeId: string) {
    return this.getEmployeeHoldings.execute(employeeId);
  }

  @Get(":id")
  @CheckPolicy(AssetPolicies.view)
  @ApiOperation({ summary: "Get an asset issue" })
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getIssue.execute(id);
  }

  @Post()
  @CheckPolicy(AssetPolicies.manageIssue)
  @AuditLog({ action: "asset_issue_create", entity: "asset_issue" })
  @ApiOperation({ summary: "Issue assets to an employee" })
  issue(@Body() dto: IssueAssetDto) {
    return this.issueAsset.execute(dto);
  }

  @Post("return")
  @CheckPolicy(AssetPolicies.manageIssue)
  @AuditLog({ action: "asset_issue_return", entity: "asset_issue" })
  @ApiOperation({ summary: "Return an issued asset" })
  return(@Body() dto: ReturnAssetDto) {
    return this.returnAsset.execute(dto);
  }
}
