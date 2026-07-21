import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

const OFFER_DECISIONS = ["accept", "decline"] as const;

export class DecideOfferDto {
  @ApiProperty({ enum: OFFER_DECISIONS })
  @IsIn(OFFER_DECISIONS)
  decision!: (typeof OFFER_DECISIONS)[number];
}
