import { type TaskAttachmentResponseDto } from "../dto/task-attachment-response.dto";

export class TaskAttachmentMapper {
  static toResponseDto(row: any /* eslint-disable-line @typescript-eslint/no-explicit-any */): TaskAttachmentResponseDto {
    const uploadedBy = row?.uploadedBy;
    return {
      id: row.id,
      taskId: row.taskId,
      uploadedByUserId: row.uploadedByUserId ?? null,
      fileName: row.fileName,
      url: row.url,
      mimeType: row.mimeType ?? null,
      size: row.size ?? null,
      createdAt: row.createdAt,
      uploadedBy: uploadedBy
        ? {
            id: uploadedBy.id,
            username: uploadedBy.username,
            email: uploadedBy.email ?? null,
          }
        : undefined,
    };
  }

  static toResponseDtos(rows: any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */): TaskAttachmentResponseDto[] {
    return rows.map((row) => TaskAttachmentMapper.toResponseDto(row));
  }
}



