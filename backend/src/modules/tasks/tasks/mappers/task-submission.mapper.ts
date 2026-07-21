import { type TaskSubmissionResponseDto } from "../dto/task-submission-response.dto";

function normalizeChecklist(value: any) {
  if (!Array.isArray(value)) return null;
  return value
    .map((item) => ({
      text: String(item?.text ?? ""),
      done: Boolean(item?.done),
    }))
    .filter((item) => item.text.trim().length > 0 || item.done);
}

export class TaskSubmissionMapper {
  static toResponseDto(row: any  ): TaskSubmissionResponseDto {
    const submittedBy = row?.submittedBy;
    return {
      id: row.id,
      taskId: row.taskId,
      submittedByUserId: row.submittedByUserId ?? null,
      version: row.version,
      resultText: row.resultText ?? null,
      checklist: normalizeChecklist(row.checklist),
      submittedAt: row.submittedAt,
      submittedBy: submittedBy
        ? {
            id: submittedBy.id,
            username: submittedBy.username,
            email: submittedBy.email ?? null,
          }
        : undefined,
    };
  }

  static toResponseDtos(rows: any[]  ): TaskSubmissionResponseDto[] {
    return rows.map((row) => TaskSubmissionMapper.toResponseDto(row));
  }
}



