import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

const POSTING_STATUSES = ["open", "paused", "closed"] as const;

export class ChangePostingStatusDto {
  @ApiProperty({ enum: POSTING_STATUSES })
  @IsIn(POSTING_STATUSES)
  status!: (typeof POSTING_STATUSES)[number];
}
