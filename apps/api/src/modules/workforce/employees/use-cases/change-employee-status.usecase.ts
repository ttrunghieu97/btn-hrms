import { Injectable } from "@nestjs/common";
import { ChangeEmployeeStatusDto } from "../dto/change-employee-status.dto";
import { EmployeeLifecycleService } from "../services/employee-lifecycle.service";

@Injectable()
export class ChangeEmployeeStatusUseCase {
  constructor(private readonly lifecycle: EmployeeLifecycleService) {}

  async execute(employeeId: string, dto: ChangeEmployeeStatusDto) {
    return this.lifecycle.changeStatus(employeeId, dto);
  }
}
