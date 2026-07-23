import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TaskActivityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taskId!: string;

  @ApiPropertyOptional()
  actorUserId?: string | null;

  @ApiProperty({
    enum: [
      "created",
      "assigned",
      "accepted",
      "declined",
      "submitted",
      "approved",
      "returned",
      "resubmitted",
      "status_changed",
      "progress_updated",
    ],
  })
  action!:
    | "created"
    | "assigned"
    | "accepted"
    | "declined"
    | "submitted"
    | "approved"
    | "returned"
    | "resubmitted"
    | "status_changed"
    | "progress_updated";

  @ApiPropertyOptional({
    enum: [
      "created",
      "assigned",
      "in_progress",
      "declined",
      "submitted",
      "revision",
      "completed",
    ],
  })
  fromStatus?:
    | "created"
    | "assigned"
    | "in_progress"
    | "declined"
    | "submitted"
    | "revision"
    | "completed"
    | null;

  @ApiPropertyOptional({
    enum: [
      "created",
      "assigned",
      "in_progress",
      "declined",
      "submitted",
      "revision",
      "completed",
    ],
  })
  toStatus?:
    | "created"
    | "assigned"
    | "in_progress"
    | "declined"
    | "submitted"
    | "revision"
    | "completed"
    | null;

  @ApiPropertyOptional()
  metadata?: Record<string, any> | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  actor?: {
    id: string;
    username: string;
    email?: string | null;
  };
}

