import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TaskAttachmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taskId!: string;

  @ApiPropertyOptional()
  uploadedByUserId?: string | null;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  url!: string;

  @ApiPropertyOptional()
  mimeType?: string | null;

  @ApiPropertyOptional()
  size?: number | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  uploadedBy?: {
    id: string;
    username: string;
    email?: string | null;
  };
}
