import { Controller, Get, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse } from "@nestjs/swagger";
import { GetDataIntegrityUseCase } from "./use-cases/get-data-integrity.usecase";
import { DataIntegrityEnvelopeDto } from "./dto/data-integrity-response.dto";
import { Permissions } from "../../../core/security/permissions/permissions.registry";
import { RequirePermission } from "../../../core/security/decorators/require-permission.decorator";
import { RequestContextService } from "../../../shared/context/request-context.service";

@ApiTags("Data Integrity")
@ApiBearerAuth()
@Controller()
export class DataIntegrityController {
  constructor(
    private readonly getDataIntegrity: GetDataIntegrityUseCase,
    @Inject(RequestContextService) private readonly requestContext: RequestContextService,
  ) {}

  @Get()
  @RequirePermission(Permissions.MONITORING_VIEW)
  @ApiOperation({ summary: "Check data integrity across all domains" })
  @ApiOkResponse({ type: DataIntegrityEnvelopeDto })
  async checkIntegrity() {
    const data = await this.getDataIntegrity.execute();
    return {
      data,
      meta: { requestId: this.requestContext.get()?.requestId ?? "", timestamp: data.checkedAt },
      error: null,
    };
  }
}
