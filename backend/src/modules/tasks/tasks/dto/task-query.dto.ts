import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
} from "class-validator";
import { PagedQueryDto } from "../../../../shared/dto/pagination.dto";

export class TaskQueryDto extends PagedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: [
      "created",
      "assigned",
      "in_progress",
      "declined",
      "submitted",
      "revision",
      "completed",
      "cancelled",
    ],
  })
  @IsOptional()
  @IsIn([
    "created",
    "assigned",
    "in_progress",
    "declined",
    "submitted",
    "revision",
    "completed",
    "cancelled",
  ])
  status?:
    | "created"
    | "assigned"
    | "in_progress"
    | "declined"
    | "submitted"
    | "revision"
    | "completed"
    | "cancelled";

  @ApiPropertyOptional({ description: "Filter by assignee employee UUID" })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ enum: ["low", "medium", "high", "urgent"] })
  @IsOptional()
  @IsIn(["low", "medium", "high", "urgent"])
  priority?: "low" | "medium" | "high" | "urgent";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ description: "Filter overdue tasks" })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional({ description: "Sort field" })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ["asc", "desc"], description: "Sort order" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";

  @ApiPropertyOptional({ description: "Filter by parent task UUID" })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;
}
