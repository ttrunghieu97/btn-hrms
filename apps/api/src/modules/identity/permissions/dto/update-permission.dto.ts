import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdatePermissionRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
