import { IsISO8601, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationLimitField } from "../../../shared/dto/pagination.dto";

export class ListMessagesDto {
  @ApiPropertyOptional({ description: "Cursor: fetch messages before this ISO timestamp" })
  @IsOptional()
  @IsISO8601()
  before?: string;

  @PaginationLimitField(50, 30)
  limit?: number = 30;
}



