import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class PublishPayslipDto {
  @ApiPropertyOptional({ enum: ["published"] })
  @IsOptional()
  @IsString()
  @IsIn(["published"])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}



