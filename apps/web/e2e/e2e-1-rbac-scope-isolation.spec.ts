import { test, expect } from "./fixtures";

test.describe("E2E-1: RBAC, Route Guards & Scope Isolation (VS-1, VS-2, VS-4)", () => {
  test("HR Admin accesses /workspace/hr live metrics and manages Notification Templates on /account/notifications", async ({
    adminPage,
  }) => {
    // 1. Verify /workspace/hr live workforce health & pending actions (VS-1)
    await adminPage.goto("/workspace/hr");
    await expect(adminPage).toHaveURL(/\/workspace\/hr/);

    await expect(
      adminPage.getByRole("heading", { name: "Workforce Health" }),
    ).toBeVisible();
    await expect(adminPage.getByText("Total Employees")).toBeVisible();
    await expect(adminPage.getByText("Probation", { exact: true })).toBeVisible();

    // Ensure no error alert is rendered on /workspace/hr
    await expect(
      adminPage.getByText("Unable to load workspace metrics"),
    ).toHaveCount(0);

    // 2. Verify /account/notifications Templates tab is visible & functional for HR Admin (VS-2)
    await adminPage.goto("/account/notifications");
    const templatesTab = adminPage.getByRole("tab", { name: "Mẫu thông báo" });
    await expect(templatesTab).toBeVisible();
    await templatesTab.click();

    await expect(
      adminPage.getByText("Mẫu thông báo hệ thống (Notification Templates)"),
    ).toBeVisible();

    const createButton = adminPage.getByRole("button", {
      name: /Tạo mẫu thông báo/i,
    });
    await expect(createButton).toBeVisible();
    await createButton.click();

    const dialog = adminPage.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const uniqueCode = `E2E_TPL_${Date.now()}`;
    await dialog.locator("#nt-name").fill(uniqueCode);
    await dialog
      .locator("#nt-subject")
      .fill("Thông báo E2E kiểm thử phân quyền");
    await dialog
      .locator("#nt-body")
      .fill("Xin chào {{employeeName}}, đây là mẫu thông báo kiểm thử E2E.");
    await dialog.getByRole("button", { name: "Tạo mẫu" }).click();

    await expect(dialog).toBeHidden();
    await expect(adminPage.getByRole("cell", { name: uniqueCode })).toBeVisible();
  });

  test("Standard Employee is blocked from admin routes, hidden from Notification Templates tab, and self-scoped on Performance", async ({
    employeePage,
    adminPage,
  }) => {
    // 1. Verify Notification Templates tab is NOT rendered for standard employee (VS-2)
    await employeePage.goto("/account/notifications");
    await expect(
      employeePage.getByRole("tab", { name: "Tùy chọn nhận thông báo" }),
    ).toBeVisible();
    await expect(
      employeePage.getByRole("tab", { name: "Mẫu thông báo" }),
    ).toHaveCount(0);

    // Direct API attempt to create a notification template as standard employee must fail with 403
    const tplForbiddenStatus = await employeePage.evaluate(async () => {
      const res = await fetch("/api/v1/platform-notifications/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: "UNAUTHORIZED_TPL",
          type: "in_app",
          body: "Should be blocked",
        }),
      });
      return res.status;
    });
    expect(tplForbiddenStatus).toBe(403);

    // 2. Verify restricted routes redirect standard employee to /unauthorized
    await employeePage.goto("/administration/users");
    await expect(employeePage).toHaveURL(/\/unauthorized/);

    await employeePage.goto("/workspace/hr");
    await expect(employeePage).toHaveURL(/\/unauthorized/);

    // 3. Verify Performance Goals self-scope isolation (VS-4)
    await employeePage.goto("/performance/goals");
    await expect(
      employeePage.getByRole("cell", {
        name: "Hoàn thành mục tiêu cá nhân Q4 - Lê Nhân viên",
      }),
    ).toBeVisible();
    await expect(
      employeePage.getByRole("cell", {
        name: "Mục tiêu Quản lý Phòng CNTT Q4 - Trần Trưởng phòng",
      }),
    ).toHaveCount(0);

    // 4. Verify Performance Reviews self-scope isolation (VS-4)
    await employeePage.goto("/performance/reviews");
    await expect(
      employeePage.getByRole("cell", { name: "Lê Nhân viên" }).first(),
    ).toBeVisible();
    await expect(
      employeePage.getByRole("cell", { name: "Trần Trưởng phòng" }),
    ).toHaveCount(0);

    // 5. Verify HR Admin sees all reviews on /performance/reviews, and cross-actor mutation by employee is rejected
    const reviewsSummaryPromise = adminPage.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/performance/cycles/") &&
        res.url().includes("/reviews/summary") &&
        res.status() === 200,
    );
    await adminPage.goto("/performance/reviews");
    const reviewsSummaryRes = await reviewsSummaryPromise;
    const reviewsSummaryBody = await reviewsSummaryRes.json();
    const summaryData = reviewsSummaryBody?.data ?? reviewsSummaryBody;
    const rows = Array.isArray(summaryData)
      ? summaryData
      : (summaryData?.rows ?? []);
    const mgrRow = rows.find(
      (r: { employeeName?: string }) => r.employeeName === "Trần Trưởng phòng",
    );
    const managerReviewId = mgrRow?.id ?? null;

    await expect(
      adminPage.getByRole("cell", { name: "Lê Nhân viên" }).first(),
    ).toBeVisible();
    await expect(
      adminPage.getByRole("cell", { name: "Trần Trưởng phòng" }).first(),
    ).toBeVisible();
    expect(managerReviewId).toBeTruthy();

    // Standard employee attempting to submit Manager's self-review must be rejected (403 Forbidden)
    const crossSubmitStatus = await employeePage.evaluate(
      async (assignmentId) => {
        const res = await fetch(
          `/api/v1/performance/review-assignments/${assignmentId}/submit`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              overallComment: "Cross-actor tamper attempt",
              ratings: [{ competencyId: "comp-1", score: 5 }],
            }),
          },
        );
        return res.status;
      },
      managerReviewId,
    );
    expect([400, 403]).toContain(crossSubmitStatus);
  });
});
