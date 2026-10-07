import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID } from "class-validator";

export class AddTaskDependencyDto {
  @ApiProperty({ description: "Task UUID that this task depends on" })
  @IsUUID()
  dependsOnTaskId!: string;

  @ApiPropertyOptional({ enum: ["blocks", "related"] })
  @IsOptional()
  @IsIn(["blocks", "related"])
  type?: "blocks" | "related";
}
