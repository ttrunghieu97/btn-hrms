import { Injectable } from "@nestjs/common";
import { PermissionsRepository } from "../repositories/permissions.repository";
import { PermissionMapper } from "../mappers/permission.mapper";

@Injectable()
export class ListPermissionsUseCase {
  constructor(private readonly permissionsRepo: PermissionsRepository) {}

  async execute() {
    const list = await this.permissionsRepo.findAll();
    return PermissionMapper.toResponseDtos(list);
  }
}
