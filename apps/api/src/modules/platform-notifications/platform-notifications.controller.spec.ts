import { Reflector } from "@nestjs/core";
import { PlatformNotificationsController } from "./platform-notifications.controller";
import { REQUIRE_PERMISSION_KEY } from "../../core/security/decorators/require-permission.decorator";
import { Permissions } from "../../core/security/permissions/permissions.registry";

describe("PlatformNotificationsController — RBAC & UseCase Delegation", () => {
  const reflector = new Reflector();

  const createTemplateUseCase = { execute: jest.fn() };
  const updateTemplateUseCase = { execute: jest.fn() };
  const getTemplateUseCase = { execute: jest.fn() };
  const listTemplatesUseCase = { execute: jest.fn() };
  const getPreferencesUseCase = { execute: jest.fn() };
  const updatePreferencesUseCase = { execute: jest.fn() };
  const getUserNotificationsUseCase = { execute: jest.fn() };
  const markNotificationReadUseCase = { execute: jest.fn() };
  const markAllNotificationsReadUseCase = { execute: jest.fn() };
  const sendNotificationUseCase = { execute: jest.fn() };

  const controller = new PlatformNotificationsController(
    createTemplateUseCase as never,
    updateTemplateUseCase as never,
    getTemplateUseCase as never,
    listTemplatesUseCase as never,
    getPreferencesUseCase as never,
    updatePreferencesUseCase as never,
    getUserNotificationsUseCase as never,
    markNotificationReadUseCase as never,
    markAllNotificationsReadUseCase as never,
    sendNotificationUseCase as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses only canonical @project/permissions codes across all endpoints", () => {
    const validPermissions = new Set<string>(Object.values(Permissions));

    const methods: Array<keyof PlatformNotificationsController> = [
      "createTemplate",
      "listTemplates",
      "getTemplate",
      "updateTemplate",
      "getPreferences",
      "updatePreferences",
      "getMyNotifications",
      "markAllNotificationsRead",
      "markNotificationRead",
      "sendNotification",
    ];

    for (const method of methods) {
      const metadata = reflector.get<string[]>(
        REQUIRE_PERMISSION_KEY,
        PlatformNotificationsController.prototype[method],
      );
      expect(metadata).toBeDefined();
      expect(metadata.length).toBeGreaterThan(0);
      for (const perm of metadata) {
        expect(validPermissions.has(perm)).toBe(true);
      }
    }
  });

  it("requires notifications:manage:all for admin template and send endpoints", () => {
    const adminMethods: Array<keyof PlatformNotificationsController> = [
      "createTemplate",
      "listTemplates",
      "getTemplate",
      "updateTemplate",
      "sendNotification",
    ];

    for (const method of adminMethods) {
      const metadata = reflector.get<string[]>(
        REQUIRE_PERMISSION_KEY,
        PlatformNotificationsController.prototype[method],
      );
      expect(metadata).toEqual([Permissions.NOTIFICATIONS_MANAGE_PLATFORM]);
    }
  });

  it("requires notifications:view:self for user preferences and inbox endpoints", () => {
    const selfMethods: Array<keyof PlatformNotificationsController> = [
      "getPreferences",
      "updatePreferences",
      "getMyNotifications",
      "markAllNotificationsRead",
      "markNotificationRead",
    ];

    for (const method of selfMethods) {
      const metadata = reflector.get<string[]>(
        REQUIRE_PERMISSION_KEY,
        PlatformNotificationsController.prototype[method],
      );
      expect(metadata).toEqual([Permissions.NOTIFICATIONS_VIEW_SELF]);
    }
  });

  it("delegates preference and inbox operations to the authenticated user's ID", async () => {
    const req = { user: { id: "user-123" } } as never;
    getPreferencesUseCase.execute.mockResolvedValue({ inAppEnabled: true });
    updatePreferencesUseCase.execute.mockResolvedValue({ inAppEnabled: false });

    await controller.getPreferences(req);
    expect(getPreferencesUseCase.execute).toHaveBeenCalledWith("user-123");

    await controller.updatePreferences(req, { inAppEnabled: false } as never);
    expect(updatePreferencesUseCase.execute).toHaveBeenCalledWith("user-123", {
      inAppEnabled: false,
    });
  });
});
