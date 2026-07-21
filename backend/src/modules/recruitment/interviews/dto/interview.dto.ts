import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ScheduleInterviewDto {
  @ApiProperty() applicationId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() interviewType!: "phone" | "video" | "in_person" | "technical" | "panel";
  @ApiProperty() scheduledAt!: string;
  @ApiPropertyOptional() durationMinutes?: number;
  @ApiPropertyOptional() location?: string;
  @ApiPropertyOptional() meetingLink?: string;
  @ApiPropertyOptional() notes?: string;
}

export class CompleteInterviewDto {
  @ApiPropertyOptional() notes?: string;
}

export class SubmitScorecardDto {
  @ApiProperty({ minimum: 1, maximum: 5 }) rating!: number;
  @ApiPropertyOptional() feedback?: string;
  @ApiPropertyOptional() rubric?: { category: string; score: number; comment?: string }[];
}

export class InterviewResponseDto {
  id!: string; applicationId!: string; title!: string; interviewType!: string;
  status!: string; scheduledAt!: Date; durationMinutes!: number | null;
}
