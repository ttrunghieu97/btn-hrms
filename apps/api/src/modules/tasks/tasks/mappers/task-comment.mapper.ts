import { type TaskCommentResponseDto } from "../dto/task-comment-response.dto";

export class TaskCommentMapper {
  static toResponseDto(row: any /* eslint-disable-line @typescript-eslint/no-explicit-any */): TaskCommentResponseDto {
    const author = row?.author;
    const employee = author?.employee;
    const department = employee?.department;

    return {
      id: row.id,
      taskId: row.taskId,
      authorUserId: row.authorUserId ?? null,
      content: row.content,
      createdAt: row.createdAt,
      author: author
        ? {
            id: author.id,
            username: author.username,
            email: author.email ?? null,
            fullName: employee ? `${employee.lastName} ${employee.firstName}`.trim() : undefined,
            departmentName: department?.name ?? null,
          }
        : undefined,
    };
  }

  static toResponseDtos(rows: any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */): TaskCommentResponseDto[] {
    return rows.map((row) => TaskCommentMapper.toResponseDto(row));
  }
}



