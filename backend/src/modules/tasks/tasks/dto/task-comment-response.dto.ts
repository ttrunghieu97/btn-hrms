import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TaskCommentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taskId!: string;

  @ApiPropertyOptional()
  authorUserId?: string | null;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  author?: {
    id: string;
    username: string;
    email?: string | null;
    fullName?: string;
    departmentName?: string | null;
  };
}
