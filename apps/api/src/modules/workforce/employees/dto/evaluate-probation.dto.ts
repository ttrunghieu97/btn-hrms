import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { IsOptionalDateString } from "../../../../shared/decorators/optional-date-string.decorator";

export const PROBATION_DECISION_VALUES = ["confirm", "extend", "fail"] as const;
export type ProbationDecision = (typeof PROBATION_DECISION_VALUES)[number];

export class EvaluateProbationDto {
  @ApiProperty({ enum: PROBATION_DECISION_VALUES })
  @IsIn(PROBATION_DECISION_VALUES)
  decision!: ProbationDecision;

  @ApiPropertyOptional({ type: String, description: "Effective date (YYYY-MM-DD)" })
  @IsOptionalDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({
    type: String,
    description: "Required when decision is 'extend' (YYYY-MM-DD)",
  })
  @IsOptionalDateString()
  newProbationEndDate?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  notes?: string;
}
