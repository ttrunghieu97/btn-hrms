import { Injectable } from "@nestjs/common";
import {
  type DepartmentReaderPort,
  type DepartmentNode,
} from "../ports/department-reader.port";
import { DepartmentsRepository } from "../../modules/organization/departments/repositories/departments.repository";

@Injectable()
export class DepartmentReaderAdapter implements DepartmentReaderPort {
  constructor(private readonly departmentRepo: DepartmentsRepository) {}

  async getTree(): Promise<DepartmentNode[]> {
    return this.departmentRepo.getTree();
  }

  async findById(id: string): Promise<{ id: string; name: string } | null> {
    const dept = await this.departmentRepo.findById(id);
    return dept ? { id: dept.id, name: dept.name } : null;
  }
}
