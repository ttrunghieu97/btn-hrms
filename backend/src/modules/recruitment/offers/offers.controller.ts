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
import { RecruitmentPolicies } from "../../../core/security/policies/recruitment.policy";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { CreateOfferDto } from "./dto/create-offer.dto";
import { DecideOfferDto } from "./dto/decide-offer.dto";
import { DraftOfferUseCase } from "./use-cases/draft-offer.usecase";
import { SubmitOfferUseCase } from "./use-cases/submit-offer.usecase";
import { DecideOfferUseCase } from "./use-cases/decide-offer.usecase";
import { GetOfferUseCase } from "./use-cases/get-offer.usecase";
import { ListApplicationOffersUseCase } from "./use-cases/list-application-offers.usecase";

@ApiTags("Recruitment Offers")
@ApiBearerAuth()
@Controller()
export class OffersController {
  constructor(
    private readonly draftOffer: DraftOfferUseCase,
    private readonly submitOffer: SubmitOfferUseCase,
    private readonly decideOffer: DecideOfferUseCase,
    private readonly getOffer: GetOfferUseCase,
    private readonly listApplicationOffers: ListApplicationOffersUseCase,
  ) {}

  @Get()
  @CheckPolicy(RecruitmentPolicies.view)
  @ApiOperation({ summary: "List offers for an application" })
  list(@Query("applicationId", new ParseUUIDPipe()) applicationId: string) {
    return this.listApplicationOffers.execute(applicationId);
  }

  @Get(":id")
  @CheckPolicy(RecruitmentPolicies.view)
  @ApiOperation({ summary: "Get an offer" })
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getOffer.execute(id);
  }

  @Post()
  @CheckPolicy(RecruitmentPolicies.manageOffer)
  @AuditLog({ action: "offer_draft", entity: "offer" })
  @ApiOperation({ summary: "Draft an offer for an application in the offer stage" })
  draft(@Body() dto: CreateOfferDto) {
    return this.draftOffer.execute(dto);
  }

  @Post(":id/submit")
  @CheckPolicy(RecruitmentPolicies.manageOffer)
  @AuditLog({ action: "offer_submit", entity: "offer" })
  @ApiOperation({ summary: "Submit an offer for approval" })
  submit(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.submitOffer.execute(id);
  }

  @Post(":id/decision")
  @CheckPolicy(RecruitmentPolicies.manageOffer)
  @AuditLog({ action: "offer_decision", entity: "offer" })
  @ApiOperation({ summary: "Record candidate acceptance or decline of an approved offer" })
  decide(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DecideOfferDto,
  ) {
    return this.decideOffer.execute(id, dto);
  }
}
