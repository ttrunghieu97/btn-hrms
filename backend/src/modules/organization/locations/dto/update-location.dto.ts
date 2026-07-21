import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { CreateLocationDto } from "./create-location.dto";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateLocationDto extends PartialType(CreateLocationDto) {
  @ApiPropertyOptional({ description: "Whether the location is active" })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}


