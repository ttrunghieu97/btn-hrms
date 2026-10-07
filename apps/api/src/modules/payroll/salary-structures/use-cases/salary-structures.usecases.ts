import { Injectable } from "@nestjs/common";
import {
  throwBadRequest,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { SalaryStructuresRepository } from "../repositories/salary-structures.repository";
import { SalaryStructureMapper } from "../mappers/salary-structure.mapper";
import { SalaryStructureQueryDto } from "../dto/salary-structure-query.dto";
import { UpsertSalaryStructureDto } from "../dto/upsert-salary-structure.dto";

@Injectable()
export class ListSalaryStructuresUseCase {
  constructor(private readonly repo: SalaryStructuresRepository) {}
  async execute(query: SalaryStructureQueryDto) {
    const result = await this.repo.list(query);
    return { ...result, rows: result.rows.map(SalaryStructureMapper.toDto) };
  }
}

@Injectable()
export class UpsertSalaryStructureUseCase {
  constructor(private readonly repo: SalaryStructuresRepository) {}
  async execute(dto: UpsertSalaryStructureDto) {
    if (dto.effectiveTo && dto.effectiveFrom > dto.effectiveTo) {
      throwBadRequest(
        "Invalid salary structure date range",
        ERROR_CODES.INVALID_REQUEST,
        dto,
      );
    }
    const result = await this.repo.list({
      employeeId: dto.employeeId,
      page: 1,
      limit: 1,
    });
    const existing = result.rows[0];
    if (existing && (dto.isCurrent ?? true)) {
      await this.repo.update(existing.id, { isCurrent: false });
    }
    const row = await this.repo.create(
      SalaryStructureMapper.toEntity({
        ...dto,
        isCurrent: dto.isCurrent ?? true,
      }) as Parameters<SalaryStructuresRepository['create']>[0],
    );
    const created = await this.repo.findById(row!.id);
    return SalaryStructureMapper.toDto(created!);
  }
}

@Injectable()
export class GetSalaryStructureUseCase {
  constructor(private readonly repo: SalaryStructuresRepository) {}
  async execute(id: string) {
    const row = await this.repo.findById(id);
    if (!row)
      throwNotFound(
        "Salary structure not found",
        ERROR_CODES.PAYROLL_NOT_FOUND,
        { salaryStructureId: id },
      );
    return SalaryStructureMapper.toDto(row);
  }
}



