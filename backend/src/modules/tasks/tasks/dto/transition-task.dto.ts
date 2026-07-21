import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";

class ChecklistItemDto {
  @ApiProperty()
  @IsString()
  text!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  done?: boolean;
}

const TRANSITIONS = [
  "assign",
  "unassign",
  "accept",
  "reject",
  "submit",
  "resubmit",
  "approve",
  "request_revision",
  "cancel",
] as const;

export type TaskTransitionName = (typeof TRANSITIONS)[number];

export class TransitionTaskDto {
  @ApiProperty({ enum: TRANSITIONS })
  @IsString()
  @IsIn(TRANSITIONS)
  transition!: TaskTransitionName;

  @ApiPropertyOptional({ description: "Reason for reject or return" })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: "Submission result text" })
  @IsOptional()
  @IsString()
  resultText?: string;

  @ApiPropertyOptional({ description: "Submission checklist", type: [ChecklistItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[] | null;

  @ApiPropertyOptional({ description: "Assignee employee id (for assign)" })
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @ApiPropertyOptional({ description: "Correlation id for audit" })
  @IsOptional()
  @IsUUID()
  correlationId?: string;
}
