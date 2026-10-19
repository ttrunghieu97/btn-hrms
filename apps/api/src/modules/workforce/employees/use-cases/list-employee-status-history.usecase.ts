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

    const missingUserIds = Array.from(
      new Set(
        rows
          .filter(
            (r: any) =>
              r.changedBy &&
              r.changedByFirstName === undefined &&
              r.changedByLastName === undefined &&
              r.changedByUsername === undefined,
          )
          .map((r: any) => r.changedBy as string),
      ),
    );

    const userDisplayMap = new Map<string, string>();
    if (missingUserIds.length > 0) {
      if (typeof this.employeesRepo.findEmployeesByUserIds === "function") {
        const emps = await this.employeesRepo.findEmployeesByUserIds(missingUserIds);
        for (const e of emps ?? []) {
          if (e?.userId) {
            const fullName = [e.lastName, e.firstName].filter(Boolean).join(" ").trim();
            if (fullName) userDisplayMap.set(e.userId, fullName);
          }
        }
      }
      if (typeof this.employeesRepo.findUserIdByUserId === "function") {
        for (const uid of missingUserIds) {
          if (!userDisplayMap.has(uid)) {
            const u = await this.employeesRepo.findUserIdByUserId(uid);
            if (u?.username) userDisplayMap.set(uid, u.username);
          }
        }
      }
    }

    return rows.map((row: any) => {
      const fullName = [row.changedByLastName, row.changedByFirstName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const changedByName =
        fullName ||
        row.changedByUsername ||
        (row.changedBy ? userDisplayMap.get(row.changedBy) ?? null : null);

      return {
        id: row.id,
        status: row.status,
        notes: row.notes,
        changedAt: row.changedAt,
        changedByUserId: row.changedBy,
        changedByName,
      };
    });
  }
}