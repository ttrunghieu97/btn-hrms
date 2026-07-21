import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiMetaDto, PaginatedMetaDto } from "../../../../shared/dto/api-response.dto";

export class TaskListEnvelopeDto {
  @ApiProperty({ type: () => [TaskResponseDto] })
  data: TaskResponseDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class TaskEnvelopeDto {
  @ApiProperty({ type: () => TaskResponseDto })
  data: any;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class TaskTransitionOptionsEnvelopeDto {
  @ApiProperty({ type: [String] })
  data: string[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class TaskResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({
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
  status!:
    | "created"
    | "assigned"
    | "in_progress"
    | "declined"
    | "submitted"
    | "revision"
    | "completed"
    | "cancelled";

  @ApiPropertyOptional()
  assigneeId?: string | null;

  @ApiPropertyOptional()
  createdByUserId?: string | null;

  @ApiPropertyOptional()
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    employeeCode: string;
    avatar?: string | null;
    departmentName?: string | null;
  };

  @ApiProperty()
  progress!: number;

  @ApiPropertyOptional()
  resultText?: string | null;

  @ApiPropertyOptional({
    type: Array,
    description: "Checklist items (text + done)",
  })
  checklist?: { text: string; done?: boolean }[] | null;

  @ApiPropertyOptional({ enum: ["low", "medium", "high", "urgent"] })
  priority?: "low" | "medium" | "high" | "urgent";

  @ApiPropertyOptional()
  dueDate?: Date | null;

  @ApiPropertyOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional()
  submittedAt?: Date | null;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiPropertyOptional()
  rejectionReason?: string | null;

  @ApiPropertyOptional()
  revisionReason?: string | null;

  @ApiPropertyOptional({
    description: "Reason provided when the task was cancelled",
  })
  cancellationReason?: string | null;

  @ApiPropertyOptional({
    description: "Number of times revision has been requested for this task",
  })
  revisionCount?: number;

  @ApiPropertyOptional()
  parentTaskId?: string | null;

  @ApiPropertyOptional()
  parent?: {
    id: string;
    title: string;
  };

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

