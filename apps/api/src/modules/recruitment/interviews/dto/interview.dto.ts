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
  @ApiProperty() id!: string;
  @ApiProperty() applicationId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() interviewType!: string;
  @ApiProperty() status!: string;
  @ApiProperty() scheduledAt!: Date;
  @ApiPropertyOptional({ nullable: true }) durationMinutes!: number | null;
  @ApiPropertyOptional({ nullable: true }) location?: string | null;
  @ApiPropertyOptional({ nullable: true }) meetingLink?: string | null;
  @ApiPropertyOptional({ nullable: true }) notes?: string | null;
}
