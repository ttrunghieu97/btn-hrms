import { Injectable } from "@nestjs/common";
import { PERMISSION_HIERARCHY } from "./permissions.registry";

/**
 * PermissionHierarchyResolver
 *
 * Resolves the transitive closure of a flat permission set.
 *
 * Example:
 *   input:  ["attendance:view:all"]
 *   output: ["attendance:view:all", "attendance:view:department", "attendance:view:self"]
 *
 * Uses the static PERMISSION_HIERARCHY table (code-level) as the primary
 * source. A runtime DB-driven override could be layered on top if needed
 * without changing the interface.
 */
@Injectable()
export class PermissionHierarchyResolver {
  /**
   * Pre-built adjacency map: parent → direct children.
   * Built once at module init — O(1) lookups afterwards.
   */
  private readonly childrenOf = new Map<string, string[]>();

  constructor() {
    for (const [parent, child] of PERMISSION_HIERARCHY) {
      const list = this.childrenOf.get(parent) ?? [];
      list.push(child);
      this.childrenOf.set(parent, list);
    }
  }

  /**
   * Expand a flat set of permission codes into the full transitive closure.
   *
   * @param permissions - raw codes (from DB or role)
   * @returns expanded set including all implied children, deduped
   */
  expand(permissions: string[]): string[] {
    const result = new Set<string>(permissions);
    const queue = [...permissions];

    while (queue.length > 0) {
      const perm = queue.shift()!;
      const children = this.childrenOf.get(perm) ?? [];
      for (const child of children) {
        if (!result.has(child)) {
          result.add(child);
          queue.push(child);
        }
      }
    }

    return Array.from(result);
  }

  /**
   * Check whether a user's effective permissions satisfy a required code,
   * considering inheritance (caller has a parent of requiredCode).
   */
  satisfies(userPermissions: string[], requiredCode: string): boolean {
    // Direct match
    if (userPermissions.includes(requiredCode)) return true;

    // Check if any user permission is an ancestor of requiredCode
    // (i.e. user has a broader permission that implies requiredCode)
    const expanded = this.expand(userPermissions);
    return expanded.includes(requiredCode);
  }
}
