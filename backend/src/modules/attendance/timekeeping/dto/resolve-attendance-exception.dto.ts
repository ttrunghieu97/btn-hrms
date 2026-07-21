import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class ResolveAttendanceExceptionDto {
  @ApiPropertyOptional({ enum: ["resolved", "closed"], default: "resolved" })
  @IsOptional()
  @IsIn(["resolved", "closed"])
  status?: "resolved" | "closed" = "resolved";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}



