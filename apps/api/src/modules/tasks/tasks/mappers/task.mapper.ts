import { type CreateTaskDto } from "../dto/create-task.dto";
import { type TaskResponseDto } from "../dto/task-response.dto";
import { type UpdateTaskDto } from "../dto/update-task.dto";

export class TaskMapper {
  static toResponseDto(row: any /* eslint-disable-line @typescript-eslint/no-explicit-any */): TaskResponseDto {
    const assignee = row?.assignee;
    let checklist: { text: string; done?: boolean }[] | null | undefined =
      undefined;
    if (row?.checklist) {
      try {
        const parsed = JSON.parse(row.checklist);
        checklist = Array.isArray(parsed) ? parsed : null;
      } catch {
        checklist = null;
      }
    }
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      status: row.status,
      assigneeId: row.assigneeId ?? null,
      progress: Number(row.progress ?? 0),
      resultText: row.resultText ?? null,
      checklist,
      priority: row.priority ?? null,
      dueDate: row.dueDate ?? null,
      startedAt: row.startedAt ?? null,
      submittedAt: row.submittedAt ?? null,
      completedAt: row.completedAt ?? null,
      rejectionReason: row.rejectionReason ?? null,
      revisionReason: row.revisionReason ?? null,
      cancellationReason: row.cancellationReason ?? null,
      revisionCount: row.revisionCount ?? 0,
      assignee: assignee
        ? {
            id: assignee.id,
            firstName: assignee.firstName,
            lastName: assignee.lastName,
            fullName: `${assignee.firstName} ${assignee.lastName}`.trim(),
            employeeCode: assignee.employeeCode,
            avatar: assignee.avatar ?? null,
            departmentName: assignee.department?.name ?? null,
          }
        : undefined,
      createdByUserId: row.createdByUserId ?? null,
      parentTaskId: row.parentTaskId ?? null,
      parent: row.parent
        ? {
            id: row.parent.id,
            title: row.parent.title,
          }
        : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toResponseDtos(rows: any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */): TaskResponseDto[] {
    return rows.map((r) => TaskMapper.toResponseDto(r));
  }

  static toEntity(dto: CreateTaskDto | UpdateTaskDto) {
    if (!dto) return {};

    const hasStatus = "status" in dto;

    return {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(hasStatus && dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.dueDate !== undefined
        ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
        : {}),
      ...(dto.progress !== undefined ? { progress: dto.progress } : {}),
      ...(dto.resultText !== undefined ? { resultText: dto.resultText } : {}),
      ...(dto.checklist !== undefined
        ? { checklist: JSON.stringify(dto.checklist ?? []) }
        : {}),
    };
  }
}



