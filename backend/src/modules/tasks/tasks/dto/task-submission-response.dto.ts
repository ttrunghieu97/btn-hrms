import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TaskSubmissionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taskId!: string;

  @ApiPropertyOptional()
  submittedByUserId?: string | null;

  @ApiProperty()
  version!: number;

  @ApiPropertyOptional()
  resultText?: string | null;

  @ApiPropertyOptional({ type: Array })
  checklist?: { text: string; done?: boolean }[] | null;

  @ApiProperty()
  submittedAt!: Date;

  @ApiPropertyOptional()
  submittedBy?: {
    id: string;
    username: string;
    email?: string | null;
  };
}
