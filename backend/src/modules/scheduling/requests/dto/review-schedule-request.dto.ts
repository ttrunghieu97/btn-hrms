import { IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum ReviewAction {
  APPROVE = "APPROVED",
  DENY = "DENIED",
}

export class ReviewScheduleRequestDto {
  @ApiProperty({ enum: ReviewAction })
  @IsEnum(ReviewAction)
  action: ReviewAction;
}
