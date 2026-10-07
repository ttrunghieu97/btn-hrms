import { Injectable } from "@nestjs/common";
import { Permissions } from "./permissions.registry";

export interface MatrixAction {
  scopes: string[];
}

export interface MatrixModule {
  [action: string]: MatrixAction;
}

export interface PermissionMatrix {
  [resource: string]: MatrixModule;
}

@Injectable()
export class PermissionMatrixService {
  getMatrix(): PermissionMatrix {
    const allPermissions = Object.values(Permissions);
    const matrix: PermissionMatrix = {};

    for (const perm of allPermissions) {
      const parts = (perm as string).split(":");
      const resource = parts[0];
      const action = parts[1];
      const scope = parts[2] || "global";

      if (!resource || !action) continue;

      if (!matrix[resource]) matrix[resource] = {};
      if (!matrix[resource][action]) {
        matrix[resource][action] = { scopes: [] };
      }

      matrix[resource][action].scopes.push(scope);
    }

    return matrix;
  }
}
