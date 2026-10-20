import { test, expect } from "./fixtures";

function nextAvailableDate2026(existingDates: string[]): string {
  let maxMs = new Date("2026-10-15T00:00:00Z").getTime();
  for (const d of existingDates) {
    if (!d || !d.startsWith("2026-")) continue;
    const ms = new Date(`${d}T00:00:00Z`).getTime();
    if (!Number.isNaN(ms) && ms > maxMs) {
      maxMs = ms;
    }
  }
  const next = new Date(maxMs);
  next.setUTCDate(next.getUTCDate() + 2);
  // Keep within 2026 balance year
  if (next.getUTCFullYear() > 2026) {
    return "2026-12-28";
  }
  return next.toISOString().split("T")[0]!;
}

function formatIsoToVN(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

test.describe("E2E-3: Attendance, Shift Requests & Leave Approval Workflow (VS-3 Verification)", () => {
  test("Standard Employee submits a leave request and Department Manager approves it via the Approval Inbox", async ({
    employeePage,
    managerPage,
  }) => {
    // 1. Standard Employee navigates to /leave/requests and inspects leave balances
    const listResponsePromise = employeePage.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/leave") &&
        !res.url().includes("/balances") &&
        !res.url().includes("/admin") &&
        res.request().method() === "GET" &&
        res.status() === 200,
    );

    await employeePage.goto("/leave/requests");
    await expect(employeePage).toHaveURL(/\/leave\/requests/);

    const listRes = await listResponsePromise;
    const listJson = await listRes.json();
    const rawRows = Array.isArray(listJson?.data)
      ? listJson.data
      : Array.isArray(listJson?.data?.rows)
        ? listJson.data.rows
        : [];
    const existingEndDates = rawRows.map((r: { endDate?: string }) => String(r?.endDate ?? ""));
    const targetDate = nextAvailableDate2026(existingEndDates);
    const vnTargetDate = formatIsoToVN(targetDate);
    const uniqueReason = `Nghỉ phép cá nhân E2E-3 (${targetDate})`;

    await expect(employeePage.getByText(/Số dư nghỉ phép/i)).toBeVisible();
    await expect(
      employeePage.getByText(/Nghỉ phép năm \(Annual Leave\)/i).first(),
    ).toBeVisible();

    // 2. Open Create Leave Request dialog and submit a 1-day Annual Leave request
    const createBtn = employeePage.getByRole("button", {
      name: /Tạo đơn nghỉ phép/i,
    });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    const dialog = employeePage.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.locator("#leave-start-date").fill(targetDate);
    await dialog.locator("#leave-end-date").fill(targetDate);

    await dialog.locator("#leave-type-id").click();
    await employeePage
      .getByRole("option", { name: /Nghỉ phép năm \(Annual Leave\)/i })
      .click();

    await dialog.locator("#leave-reason").fill(uniqueReason);

    const createLeaveResPromise = employeePage.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/leave") &&
        res.request().method() === "POST" &&
        res.status() >= 200 &&
        res.status() < 300,
    );
    await dialog.getByRole("button", { name: /^Tạo$/i }).click();
    await createLeaveResPromise;

    await expect(dialog).toBeHidden();

    // Verify new row appears in employee's leave table with status "Chờ duyệt"
    const employeeRow = employeePage
      .getByRole("row")
      .filter({ hasText: `${vnTargetDate} → ${vnTargetDate}` });
    await expect(employeeRow.first()).toBeVisible();
    await expect(employeeRow.first().getByText("Chờ duyệt")).toBeVisible();

    // 3. Department Manager opens /leave/requests and approves the pending request from the Approval Inbox
    await managerPage.goto("/leave/requests");
    await expect(managerPage).toHaveURL(/\/leave\/requests/);

    await expect(
      managerPage.getByText(/Hộp thư phê duyệt: Cần bạn xử lý/i),
    ).toBeVisible();
    await expect(managerPage.getByText(uniqueReason)).toBeVisible();

    const approveResPromise = managerPage.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/approval/inbox/") &&
        res.url().includes("/approve") &&
        res.request().method() === "POST",
    );

    const inboxCard = managerPage
      .locator("div.rounded-lg.border")
      .filter({ hasText: uniqueReason })
      .first();
    await inboxCard.getByRole("button", { name: /^Duyệt$/i }).click();

    const approveRes = await approveResPromise;
    expect(approveRes.status()).toBeGreaterThanOrEqual(200);
    expect(approveRes.status()).toBeLessThan(300);

    // 4. Verify request status transitions to "Đã duyệt" in Manager's table & persists on reload
    const managerRow = managerPage
      .getByRole("row")
      .filter({ hasText: `${vnTargetDate} → ${vnTargetDate}` });
    await expect(managerRow.first().getByText("Đã duyệt")).toBeVisible();

    await employeePage.reload();
    const reloadedEmployeeRow = employeePage
      .getByRole("row")
      .filter({ hasText: `${vnTargetDate} → ${vnTargetDate}` });
    await expect(reloadedEmployeeRow.first().getByText("Đã duyệt")).toBeVisible();
  });

  test("Standard Employee views /attendance, submits a shift exception request on /schedule/my-schedule, and HR Admin approves it on /schedule/requests", async ({
    employeePage,
    adminPage,
  }) => {
    // 1. Verify /attendance loads live attendance view cleanly for Standard Employee
    await employeePage.goto("/attendance");
    await expect(employeePage).toHaveURL(/\/attendance/);
    await expect(employeePage.locator("main")).toBeVisible();

    // 2. Navigate to /schedule/my-schedule and submit a shift exception request
    await employeePage.goto("/schedule/my-schedule");
    await expect(employeePage).toHaveURL(/\/schedule\/my-schedule/);
    await expect(
      employeePage.getByRole("heading", { name: /Lịch của tôi/i }).first(),
    ).toBeVisible();

    const openSheetBtn = employeePage.getByRole("button", {
      name: /Gửi yêu cầu/i,
    });
    await expect(openSheetBtn).toBeVisible();
    await openSheetBtn.click();

    const sheet = employeePage.getByRole("dialog");
    await expect(sheet).toBeVisible();

    const scheduleDate = "2026-11-25";
    const uniqueScheduleReason = `Xin nghỉ ca sáng E2E-3 (${Date.now()})`;

    await sheet.locator('input[type="date"]').fill(scheduleDate);
    await sheet
      .getByPlaceholder("Tùy chọn")
      .fill(uniqueScheduleReason);

    const createSchedResPromise = employeePage.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/workforce/schedules/schedule-requests") &&
        res.request().method() === "POST",
    );
    await sheet.getByRole("button", { name: /Gửi yêu cầu/i }).click();
    const createSchedRes = await createSchedResPromise;
    expect(createSchedRes.status()).toBeGreaterThanOrEqual(200);
    expect(createSchedRes.status()).toBeLessThan(300);

    await expect(sheet).toBeHidden();
    await expect(employeePage.getByText(uniqueScheduleReason)).toBeVisible();

    // 3. HR Admin navigates to /schedule/requests, reviews the pending shift request, and approves it
    await adminPage.goto("/schedule/requests");
    await expect(adminPage).toHaveURL(/\/schedule\/requests/);
    await expect(adminPage.getByText("Tổng đề xuất")).toBeVisible();
    await expect(adminPage.getByText("Chờ quản lý duyệt")).toBeVisible();

    const requestRow = adminPage
      .getByRole("row")
      .filter({ hasText: uniqueScheduleReason });
    await expect(requestRow).toBeVisible();
    await expect(requestRow.getByText("Chờ duyệt")).toBeVisible();

    const approveSchedResPromise = adminPage.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/workforce/schedules/schedule-requests/") &&
        res.url().includes("/approve") &&
        res.request().method() === "POST",
    );
    await requestRow.getByRole("button", { name: /Duyệt/i }).click();
    const approveSchedRes = await approveSchedResPromise;
    expect(approveSchedRes.status()).toBeGreaterThanOrEqual(200);
    expect(approveSchedRes.status()).toBeLessThan(300);

    await expect(requestRow.getByText("Đã duyệt")).toBeVisible();
    await expect(
      requestRow.getByText(/Tự động cập nhật bảng ca/i),
    ).toBeVisible();

    // Reload to verify DB persistence
    await adminPage.reload();
    const reloadedRow = adminPage
      .getByRole("row")
      .filter({ hasText: uniqueScheduleReason });
    await expect(reloadedRow.getByText("Đã duyệt")).toBeVisible();
  });
});
