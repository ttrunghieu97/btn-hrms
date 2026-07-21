import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCycleDto {
  @ApiProperty() name!: string;
  @ApiProperty() startsOn!: string;
  @ApiProperty() endsOn!: string;
  @ApiPropertyOptional() config?: any;
}

export class UpdateCycleConfigDto {
  @ApiPropertyOptional() config?: any;
}

export class CreateGoalDto {
  @ApiProperty() title!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() employeeIds?: string[];
}

export class AssignGoalDto {
  @ApiProperty() employeeId!: string;
  @ApiPropertyOptional() weight?: number;
}

export class AssignReviewerDto {
  @ApiProperty() cycleId!: string;
  @ApiProperty() employeeId!: string;
  @ApiProperty() reviewerId!: string;
  @ApiProperty() reviewType!: "self" | "manager" | "peer" | "subordinate" | "committee";
  @ApiPropertyOptional() dueDate?: string;
}

export class SubmitReviewDto {
  @ApiPropertyOptional() overallComment?: string;
  @ApiPropertyOptional() ratings?: { competencyId: string; score: number; comment?: string }[];
}

export class PublishResultDto {
  @ApiProperty() employeeId!: string;
  @ApiPropertyOptional() finalScore?: number;
  @ApiPropertyOptional() ratingLabel?: string;
  @ApiPropertyOptional() summary?: string;
}

export class CycleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() status!: string;
  @ApiProperty() startsOn!: string;
  @ApiProperty() endsOn!: string;
  @ApiPropertyOptional() config?: any;
  @ApiProperty() createdAt!: Date;
}

export class GoalResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() status!: string;
}
