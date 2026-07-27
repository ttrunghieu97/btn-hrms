import { Injectable } from "@nestjs/common";
import {
  NavigationRegistry,
  type NavResponseDto,
  type NavItemDefinition,
} from "../nav.registry";

export interface PermissionedUser {
  permissions?: string[];
  isSuperAdmin?: boolean;
}

/**
 * Simple permission check (mirrors frontend rbac.ts logic server-side).
 * `sys:all` root permission handled by resolver — no separate super-admin bypass.
 */
function hasPermission(user: PermissionedUser, perm: string): boolean {
  const owned = user.permissions ?? [];
  if (owned.includes(perm)) return true;
  if (owned.includes("sys:all")) return true;
  // :view shortcut — :manage implies :view
  if (perm.endsWith(":view")) {
    return owned.includes(perm.replace(/:view$/, ":manage"));
  }
  return false;
}

function anyOf(user: PermissionedUser, perms?: string[]): boolean {
  if (!perms || perms.length === 0) return true;
  return perms.some((p) => hasPermission(user, p));
}

@Injectable()
export class NavService {
  constructor(private readonly registry: NavigationRegistry) {}

  /** Build nav tree for a given user, filtering by permissions */
  getNavForUser(user: PermissionedUser): NavResponseDto {
    const allGroups = this.registry.getAllGroups();

    const groups = allGroups
      .map((group) => ({
        ...group,
        items: this.filterItems(group.items, user),
      }))
      .filter((group) => group.items.length > 0);

    return {
      groups,
      version: 1,
      generatedAt: new Date().toISOString(),
    };
  }

  private filterItems(
    items: NavItemDefinition[],
    user: PermissionedUser,
  ): NavItemDefinition[] {
    return items
      .filter((item) => {
        if (item.state === "disabled" || item.state === "coming_soon") {
          return true; // Show disabled items — FE renders them greyed out
        }
        return anyOf(user, item.requiredPermissions);
      })
      .map((item) => ({
        ...item,
        children: item.children
          ? this.filterItems(item.children, user)
          : undefined,
      }));
  }
}
