import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { NavigationRegistry, NavState } from "./nav.registry";

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
    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
      id: "workforce",
      label: "Employees",
      items: [
        {
          id: "employees",
          label: "Employees",
          href: "/employees",
          icon: "employee",
          requiredPermissions: [
            "employees:view:self",
            "employees:view:department",
            "employees:view:all",
          ],
        },
      ],
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
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
    });

    this.registry.registerGroup({
      id: "account",
      label: "Account",
      items: [
        {
          id: "profile",
          label: "Profile",
          href: "/account/profile",
          icon: "profile",
          requiredPermissions: ["profile:view"],
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
    });

    this.registry.registerGroup({
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
    });
  }
}
