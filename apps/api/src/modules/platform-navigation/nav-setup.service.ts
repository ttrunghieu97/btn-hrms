import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import {
  NavigationRegistry,
  type NavGroupDefinition,
} from "./nav.registry";

const DEFAULT_ENABLED_GROUP_IDS = ["workforce", "attendance"] as const;

const GROUP_ID_ALIASES: Readonly<Record<string, string>> = {
  employees: "workforce",
};

export function resolveEnabledGroupIds(envOverride?: string): Set<string> {
  const raw = (
    envOverride ??
    process.env.ENABLED_NAV_GROUPS ??
    process.env.NEXT_PUBLIC_ENABLED_MODULES ??
    ""
  ).trim();
  if (!raw) {
    return new Set(DEFAULT_ENABLED_GROUP_IDS);
  }
  const resolved = new Set<string>();
  for (const token of raw.split(",")) {
    const id = token.trim().toLowerCase();
    if (!id) continue;
    resolved.add(GROUP_ID_ALIASES[id] ?? id);
  }
  return resolved;
}

/**
 * Register all nav items at application bootstrap.
 * Freezes the registry after registration to prevent runtime mutation.
 */
@Injectable()
export class NavSetupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NavSetupService.name);

  constructor(private readonly registry: NavigationRegistry) {}

  onApplicationBootstrap() {
    this.registerAll();
    this.registry.freeze();
    this.logger.log(
      `Navigation registry frozen with ${this.registry.getAllGroups().length} groups`,
    );
  }

  private registerAll() {
    const enabledGroupIds = resolveEnabledGroupIds();
    const groups: NavGroupDefinition[] = [
      {
        id: "overview",
        label: "Overview",
        items: [
          {
            id: "overview",
            label: "Dashboard",
            href: "/overview",
            icon: "dashboard",
            requiredPermissions: ["dashboard:view"],
          },
        ],
      },
      {
        id: "workforce",
        label: "Employees",
        items: [
          {
            id: "employees",
            label: "Employees",
            href: "/employees",
            icon: "employee",
            requiredPermissions: [
              "employees:view:department",
              "employees:view:all",
              "employees:view",
              "employees:view:self",
            ],
          },
        ],
      },
      {
        id: "organization",
        label: "Organization",
        items: [
          {
            id: "organization",
            label: "Organization",
            href: "/organization",
            icon: "department",
            requiredPermissions: ["organization:view"],
          },
        ],
      },
      {
        id: "attendance",
        label: "Attendance",
        items: [
          {
            id: "attendance",
            label: "Attendance",
            href: "/attendance",
            icon: "calendar",
            requiredPermissions: [
              "attendance:view:self",
              "attendance:view:department",
              "attendance:view:all",
            ],
          },
        ],
      },
      {
        id: "leave",
        label: "Leave",
        items: [
          {
            id: "leave",
            label: "Leave",
            href: "/leave",
            icon: "page",
            requiredPermissions: [
              "leave:view:self",
              "leave:view:department",
              "leave:view:all",
            ],
          },
        ],
      },
      {
        id: "recruitment",
        label: "Recruitment",
        items: [
          {
            id: "recruitment",
            label: "Recruitment",
            href: "/recruitment/requisitions",
            icon: "people",
            requiredPermissions: ["recruitment:view"],
          },
        ],
      },
      {
        id: "asset-management",
        label: "Asset Management",
        items: [
          {
            id: "asset-management",
            label: "Assets",
            href: "/asset-management/catalog",
            icon: "product",
            requiredPermissions: ["asset:view"],
          },
        ],
      },
      {
        id: "benefits",
        label: "Benefits",
        items: [
          {
            id: "benefits",
            label: "Benefits",
            href: "/benefits/plans",
            icon: "shieldCheck",
            requiredPermissions: ["benefits:view"],
          },
        ],
      },
      {
        id: "expenses",
        label: "Expenses",
        items: [
          {
            id: "expenses",
            label: "Expenses",
            href: "/expenses",
            icon: "page",
            requiredPermissions: ["expenses:view"],
          },
        ],
      },
      {
        id: "performance",
        label: "Performance",
        items: [
          {
            id: "performance",
            label: "Performance",
            href: "/performance/cycles",
            icon: "trophy",
            requiredPermissions: ["performance:view"],
          },
        ],
      },
      {
        id: "learning",
        label: "Learning",
        items: [
          {
            id: "learning",
            label: "Learning",
            href: "/learning/courses",
            icon: "school",
            requiredPermissions: ["learning:view"],
          },
        ],
      },
      {
        id: "onboarding",
        label: "Onboarding",
        items: [
          {
            id: "onboarding",
            label: "Onboarding",
            href: "/onboarding",
            icon: "exclusive",
            requiredPermissions: ["onboarding:view"],
          },
        ],
      },
      {
        id: "schedule",
        label: "Schedule",
        items: [
          {
            id: "schedule",
            label: "Schedule",
            href: "/schedule",
            icon: "calendar",
            requiredPermissions: ["schedule:view"],
          },
        ],
      },
      {
        id: "tasks",
        label: "Tasks",
        items: [
          {
            id: "tasks",
            label: "Tasks",
            href: "/tasks",
            icon: "task",
            requiredPermissions: ["tasks:view"],
          },
          {
            id: "chat",
            label: "Chat",
            href: "/chat",
            icon: "chat",
            requiredPermissions: ["chat:view"],
          },
        ],
      },
      {
        id: "monitoring",
        label: "Monitoring",
        items: [
          {
            id: "monitoring",
            label: "Monitoring",
            href: "/monitoring",
            icon: "activity",
            requiredPermissions: ["monitoring:view"],
          },
        ],
      },
      {
        id: "payroll",
        label: "Payroll",
        items: [
          {
            id: "payroll",
            label: "Payroll",
            href: "/payroll",
            icon: "page",
            requiredPermissions: ["payroll:view"],
          },
        ],
      },
      {
        id: "administration",
        label: "Administration",
        items: [
          {
            id: "administration",
            label: "Administration",
            href: "/administration",
            icon: "settings",
            requiredPermissions: [
              "users:view",
              "users:edit",
              "approval-policies:view",
              "approval-requests:view",
            ],
          },
        ],
      },
      {
        id: "account",
        label: "Account",
        items: [
          {
            id: "profile",
            label: "Profile",
            href: "/account/profile",
            icon: "profile",
            requiredPermissions: ["profile:view", "employees:view:self"],
          },
          {
            id: "notifications",
            label: "Notifications",
            href: "/account/notifications",
            icon: "notification",
            requiredPermissions: ["notifications:view"],
          },
          {
            id: "change-password",
            label: "Change Password",
            href: "/change-password",
            icon: "lock",
            requiredPermissions: ["auth:change-password"],
          },
        ],
      },
      {
        id: "offboarding",
        label: "Offboarding",
        items: [
          {
            id: "offboarding",
            label: "Offboarding",
            href: "/offboarding",
            icon: "logout",
            requiredPermissions: ["offboarding:view"],
          },
        ],
      },
    ];

    const enableAll =
      enabledGroupIds.has("*") || enabledGroupIds.has("all");

    for (const group of groups) {
      const isEnabled =
        enabledGroupIds.has(group.id) ||
        (enableAll && group.id !== "account");
      if (isEnabled) {
        this.registry.registerGroup(group);
      }
    }
  }
}
