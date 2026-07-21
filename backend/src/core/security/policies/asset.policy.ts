import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "./base.policy";
import { Permissions } from "../permissions/permissions.registry";

function hasAny(user: AuthUser, ...perms: string[]): boolean {
  if (user.isSuperAdmin || user.permissions?.includes("ALL")) return true;
  const granted = user.permissions ?? [];
  return perms.some((p) => granted.includes(p));
}

class ViewAssetPolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.ASSET_VIEW];
  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.ASSET_VIEW);
  }
}

class ManageCatalogPolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.ASSET_CATALOG_MANAGE];
  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.ASSET_CATALOG_MANAGE);
  }
}

class ManageInventoryPolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.ASSET_INVENTORY_MANAGE];
  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.ASSET_INVENTORY_MANAGE);
  }
}

class CreateRequestPolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.ASSET_REQUEST_CREATE];
  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.ASSET_REQUEST_CREATE);
  }
}

class ApproveRequestPolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.ASSET_REQUEST_APPROVE];
  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.ASSET_REQUEST_APPROVE);
  }
}

class ManageIssuePolicyHandler implements PolicyHandler {
  requiredAnyOfPermissions = [Permissions.ASSET_ISSUE_MANAGE];
  handle(user: AuthUser): boolean {
    return hasAny(user, Permissions.ASSET_ISSUE_MANAGE);
  }
}

export const AssetPolicies = {
  view: new ViewAssetPolicyHandler(),
  manageCatalog: new ManageCatalogPolicyHandler(),
  manageInventory: new ManageInventoryPolicyHandler(),
  createRequest: new CreateRequestPolicyHandler(),
  approveRequest: new ApproveRequestPolicyHandler(),
  manageIssue: new ManageIssuePolicyHandler(),
};
