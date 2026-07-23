import { Injectable } from "@nestjs/common";
import { RoleAssignmentPort } from "../ports/role-assignment.port";
import { AssignDefaultEmployeeRoleUseCase } from "../../modules/identity/access-control/use-cases/assign-default-employee-role.usecase";

@Injectable()
export class RoleAssignmentAdapter implements RoleAssignmentPort {
  constructor(
    private readonly defaultRoleAssigner: AssignDefaultEmployeeRoleUseCase,
  ) {}

  async assignDefaultRole(userId: string): Promise<{ roleId: string; roleName: string }> {
    return this.defaultRoleAssigner.execute(userId);
  }
}
