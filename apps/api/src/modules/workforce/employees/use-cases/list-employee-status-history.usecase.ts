import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { EmployeeStatusHistoryItemDto } from "../dto/employee-status-history.dto";

@Injectable()
export class ListEmployeeStatusHistoryUseCase {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
  ) {}

  async execute(employeeId: string): Promise<EmployeeStatusHistoryItemDto[]> {
    const rows = await this.employeesRepo.listStatusHistory(employeeId);

    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      notes: row.notes,
      changedAt: row.changedAt,
      changedByUserId: row.changedBy,
      changedByName: null,
    }));
  }
}