import type { TaskResponseDto } from '../../../api/generated/model';

export interface TaskAssignee {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  employeeCode: string;
  avatar?: string | null;
  departmentName?: string | null;
}

export interface Task extends Omit<TaskResponseDto, 'assignee' | 'description' | 'dueDate' | 'startedAt' | 'submittedAt' | 'completedAt' | 'rejectionReason' | 'revisionReason' | 'cancellationReason' | 'resultText' | 'assigneeId' | 'createdByUserId' | 'parentTaskId' | 'parent'> {
  assignee?: TaskAssignee | null;
  description?: string | null;
  dueDate?: string | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  rejectionReason?: string | null;
  revisionReason?: string | null;
  cancellationReason?: string | null;
  resultText?: string | null;
  assigneeId?: string | null;
  createdByUserId?: string | null;
  parentTaskId?: string | null;
  parent?: { id: string; title: string } | null;
}

export function asTask(dto: TaskResponseDto): Task {
  return dto as unknown as Task;
}

export function asTasks(dtos: TaskResponseDto[]): Task[] {
  return dtos as unknown as Task[];
}
