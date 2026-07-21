/**
 * Navigation Registry
 *
 * Singleton registry for all nav items across domains.
 * Each domain module calls `register()` at bootstrap via module provider.
 * Frozen after bootstrap to prevent runtime mutation.
 *
 * WHY NOT single giant nav config:
 * - Domain ownership: each module owns its nav items
 * - Plugin-friendly: adding/removing modules is declarative
 * - No centralized file that needs updating for every change
 */
import { Injectable } from "@nestjs/common";

export enum NavState {
  ENABLED = "enabled",
  DISABLED = "disabled",
  BETA = "beta",
  COMING_SOON = "coming_soon",
  MAINTENANCE = "maintenance",
}

export interface NavBadge {
  type: "beta" | "new" | "soon" | "maintenance";
  label?: string;
}

export interface NavItemDefinition {
  id: string;
  label: string;
  href: string;
  icon?: string;
  state?: NavState;
  children?: NavItemDefinition[];
  /** Permissions required to see this item (anyOf semantics) */
  requiredPermissions?: string[];
  badge?: NavBadge;
}

export interface NavGroupDefinition {
  id: string;
  label: string;
  items: NavItemDefinition[];
}

export interface NavResponseDto {
  groups: NavGroupDefinition[];
  version: number;
  generatedAt: string;
}

@Injectable()
export class NavigationRegistry {
  private groups = new Map<string, NavGroupDefinition>();
  private frozen = false;

  /** Register a group with its items. Throws if frozen. */
  registerGroup(group: NavGroupDefinition): void {
    if (this.frozen) {
      throw new Error(
        `NavigationRegistry is frozen: cannot register group "${group.id}"`,
      );
    }
    const existing = this.groups.get(group.id);
    if (existing) {
      const existingIds = new Set(existing.items.map((i) => i.id));
      for (const item of group.items) {
        if (!existingIds.has(item.id)) {
          existing.items.push(item);
        }
      }
    } else {
      this.groups.set(group.id, { ...group, items: [...group.items] });
    }
  }

  /** Get all groups. Returns a deep clone to prevent mutation. */
  getAllGroups(): NavGroupDefinition[] {
    return structuredClone(Array.from(this.groups.values()));
  }

  /** Freeze registry. registerGroup() will throw after this call. */
  freeze(): void {
    this.frozen = true;
  }

  /** Check if registry is frozen */
  isFrozen(): boolean {
    return this.frozen;
  }

  /** Clear and rebuild (for testing / module reload) */
  reset(): void {
    if (this.frozen) {
      throw new Error("NavigationRegistry is frozen: cannot reset");
    }
    this.groups.clear();
  }
}
