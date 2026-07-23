import { type TaskAssignmentResponseDto } from "../dto/task-assignment-response.dto";

export class TaskAssignmentMapper {
  static toResponseDto(row: any  ): TaskAssignmentResponseDto {
    const employee = row?.employee;
    const assignedBy = row?.assignedBy;

    return {
      id: row.id,
      taskId: row.taskId,
      employeeId: row.employeeId ?? null,
      assignedByUserId: row.assignedByUserId ?? null,
      assignedAt: row.assignedAt,
      employee: employee
        ? {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            fullName: `${employee.firstName} ${employee.lastName}`.trim(),
            employeeCode: employee.employeeCode,
            avatar: employee.avatar ?? null,
            departmentName: employee.department?.name ?? null,
          }
        : undefined,
      assignedBy: assignedBy
        ? {
            id: assignedBy.id,
            username: assignedBy.username,
            email: assignedBy.email ?? null,
          }
        : undefined,
    };
  }

  static toResponseDtos(rows: any[]  ): TaskAssignmentResponseDto[] {
    return rows.map((row) => TaskAssignmentMapper.toResponseDto(row));
  }
}



