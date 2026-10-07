import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TaskNotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  taskId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  body?: string | null;

  @ApiProperty()
  isRead!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
