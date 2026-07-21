import { Injectable } from "@nestjs/common";
import {
  throwBadRequest,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { LeaveAdminRepository } from "../repositories/leave-admin.repository";
import { LeaveAdminMapper } from "../mappers/leave-admin.mapper";

@Injectable()
export class ListLeavePoliciesUseCase {
  constructor(private readonly repo: LeaveAdminRepository) {}
  async execute(query: any) {
    const result = await this.repo.listLeavePolicies(query);
    return {
      ...result,
      rows: result.rows.map(LeaveAdminMapper.toLeavePolicyDto),
    };
  }
}

@Injectable()
export class CreateLeavePolicyUseCase {
  constructor(private readonly repo: LeaveAdminRepository) {}
  async execute(dto: any) {
    if (dto.effectiveTo && dto.effectiveFrom > dto.effectiveTo) {
      throwBadRequest(
        "Invalid leave policy date range",
        ERROR_CODES.INVALID_REQUEST,
        dto,
      );
    }
    const row = await this.repo.create({
      values: LeaveAdminMapper.toLeavePolicyEntity(dto),
    });
    return LeaveAdminMapper.toLeavePolicyDto(row);
  }
}

@Injectable()
export class UpdateLeavePolicyUseCase {
  constructor(private readonly repo: LeaveAdminRepository) {}
  async execute(id: string, dto: any) {
    const existing = await this.repo.getLeavePolicy(id);
    if (!existing)
      throwNotFound("Leave policy not found", ERROR_CODES.INVALID_REQUEST, {
        leavePolicyId: id,
      });
    const effectiveFrom = dto.effectiveFrom ?? existing.effectiveFrom;
    const effectiveTo = dto.effectiveTo ?? existing.effectiveTo;
    if (effectiveTo && effectiveFrom > effectiveTo) {
      throwBadRequest(
        "Invalid leave policy date range",
        ERROR_CODES.INVALID_REQUEST,
        { effectiveFrom, effectiveTo },
      );
    }
    const row = await this.repo.update(id, {
      values: LeaveAdminMapper.toLeavePolicyEntity(dto),
    });
    return LeaveAdminMapper.toLeavePolicyDto(row);
  }
}

@Injectable()
export class ListLeaveTypesUseCase {
  constructor(private readonly repo: LeaveAdminRepository) {}
  async execute(query: any) {
    const result = await this.repo.listLeaveTypes(query);
    return {
      ...result,
      rows: result.rows.map(LeaveAdminMapper.toLeaveTypeDto),
    };
  }
}

@Injectable()
export class CreateLeaveTypeUseCase {
  constructor(private readonly repo: LeaveAdminRepository) {}
  async execute(dto: any) {
    const row = await this.repo.create({
      target: "type",
      values: LeaveAdminMapper.toLeaveTypeEntity(dto),
    });
    return LeaveAdminMapper.toLeaveTypeDto(row);
  }
}

@Injectable()
export class UpdateLeaveTypeUseCase {
  constructor(private readonly repo: LeaveAdminRepository) {}
  async execute(id: string, dto: any) {
    const existing = await this.repo.getLeaveType(id);
    if (!existing)
      throwNotFound("Leave type not found", ERROR_CODES.INVALID_REQUEST, {
        leaveTypeId: id,
      });
    const row = await this.repo.update(id, {
      target: "type",
      values: LeaveAdminMapper.toLeaveTypeEntity(dto),
    });
    return LeaveAdminMapper.toLeaveTypeDto(row);
  }
}






