import path from "node:path";
import {
  test as base,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";

export const AUTH_DIR = path.resolve(__dirname, "../playwright/.auth");

export const STORAGE_STATE = {
  admin: path.join(AUTH_DIR, "admin.json"),
  manager: path.join(AUTH_DIR, "manager.json"),
  employee: path.join(AUTH_DIR, "employee.json"),
} as const;

export interface RuntimeErrorTracker {
  pageErrors: string[];
  serverErrors: string[];
  assertClean: () => void;
}

/**
 * Attaches strict runtime error listeners to a Playwright Page:
 * 1. Fails on any uncaught client-side exception (`pageerror`).
 * 2. Fails on any unexpected HTTP 5xx response (`status >= 500`) from `/api/`.
 */
export function attachRuntimeErrorTracker(page: Page): RuntimeErrorTracker {
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];

  page.on("pageerror", (err) => {
    const message = err?.stack || err?.message || String(err);
    pageErrors.push(message);
  });

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (status >= 500 && url.includes("/api/")) {
      serverErrors.push(
        `HTTP ${status} ${response.request().method()} ${url}`,
      );
    }
  });

  return {
    pageErrors,
    serverErrors,
    assertClean: () => {
      expect(
        pageErrors,
        `Unhandled client-side pageerror(s) detected:\n${pageErrors.join("\n---\n")}`,
      ).toEqual([]);
      expect(
        serverErrors,
        `Unexpected 5xx API response(s) detected:\n${serverErrors.join("\n")}`,
      ).toEqual([]);
    },
  };
}

type HrmsFixtures = {
  adminContext: BrowserContext;
  adminPage: Page;
  managerContext: BrowserContext;
  managerPage: Page;
  employeeContext: BrowserContext;
  employeePage: Page;
};

export const test = base.extend<HrmsFixtures>({
  page: async ({ page }, use) => {
    const tracker = attachRuntimeErrorTracker(page);
    await use(page);
    tracker.assertClean();
  },

  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: STORAGE_STATE.admin,
    });
    await use(context);
    await context.close();
  },

  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    const tracker = attachRuntimeErrorTracker(page);
    await use(page);
    tracker.assertClean();
  },

  managerContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: STORAGE_STATE.manager,
    });
    await use(context);
    await context.close();
  },

  managerPage: async ({ managerContext }, use) => {
    const page = await managerContext.newPage();
    const tracker = attachRuntimeErrorTracker(page);
    await use(page);
    tracker.assertClean();
  },

  employeeContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: STORAGE_STATE.employee,
    });
    await use(context);
    await context.close();
  },

  employeePage: async ({ employeeContext }, use) => {
    const page = await employeeContext.newPage();
    const tracker = attachRuntimeErrorTracker(page);
    await use(page);
    tracker.assertClean();
  },
});

export { expect };
