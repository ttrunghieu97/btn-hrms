import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class AttachCvDto {
  @ApiProperty({ description: "Temp upload token for the candidate CV" })
  @IsString()
  @MinLength(1)
  fileToken!: string;
}
