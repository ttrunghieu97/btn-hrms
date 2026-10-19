import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsString } from "class-validator";

export class SubmitResignationDto {
  @ApiProperty({
    type: String,
    description: "Requested last working date (YYYY-MM-DD)",
  })
  @IsDateString()
  requestedLastWorkingDate!: string;

  @ApiProperty({ type: String, description: "Resignation reason" })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
