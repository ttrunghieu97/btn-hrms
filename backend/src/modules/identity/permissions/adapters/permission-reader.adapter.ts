import { Injectable } from "@nestjs/common";
import { IPermissionReader } from "../../../../contracts/ports/permission-reader.port";
import { PermissionCacheService } from "../permission-cache.service";

@Injectable()
export class PermissionReaderAdapter implements IPermissionReader {
  constructor(private readonly permissionCache: PermissionCacheService) {}

  async getPermissions(userId: string): Promise<string[]> {
    return this.permissionCache.getPermissions(userId);
  }

  async invalidate(userId: string): Promise<void> {
    return this.permissionCache.invalidate(userId);
  }
}
