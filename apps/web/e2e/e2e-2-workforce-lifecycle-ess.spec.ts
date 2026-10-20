import { test, expect } from "./fixtures";

function addDaysIso(baseDateStr: string | null | undefined, days: number): string {
  const base = baseDateStr ? new Date(`${baseDateStr}T00:00:00Z`) : new Date("2026-12-01T00:00:00Z");
  if (Number.isNaN(base.getTime())) {
    return "2027-01-15";
  }
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().split("T")[0]!;
}

function formatIsoToVN(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

test.describe("E2E-2: Workforce Lifecycle & Employee Self-Service", () => {
  test("HR Admin inspects decrypted employee profile & contract and executes Probation Evaluation lifecycle action", async ({
    adminPage,
  }) => {
    // 1. Navigate to /employees and locate seeded probation employee EMP-PROB-01 (Phạm Thử việc)
    await adminPage.goto("/employees");
    await expect(adminPage.getByRole("cell", { name: "EMP-STD-01" })).toBeVisible();
    await expect(adminPage.getByRole("cell", { name: "EMP-PROB-01" })).toBeVisible();

    // Click EMP-PROB-01 row to open Quick-Peek Sheet and navigate to full detail page
    const detailResponsePromise = adminPage.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/employees/") &&
        res.request().method() === "GET" &&
        res.status() === 200,
    );
    await adminPage.getByRole("cell", { name: "EMP-PROB-01" }).click();

    const fullProfileLink = adminPage.getByRole("link", {
      name: /Mở hồ sơ đầy đủ/i,
    });
    await expect(fullProfileLink).toBeVisible();
    await fullProfileLink.click();

    await expect(adminPage).toHaveURL(/\/employees\/[0-9a-f-]{36}/);
    const detailRes = await detailResponsePromise;
    const detailBody = await detailRes.json();
    const empData = detailBody?.data ?? detailBody;
    const currentProbationEnd = empData?.probationEndDate ?? "2026-11-30";
    const nextProbationEnd = addDaysIso(currentProbationEnd, 2);
    const expectedVnDate = formatIsoToVN(nextProbationEnd);

    // 2. Verify decrypted PII fields & contract card render cleanly without raw ciphertext
    await expect(
      adminPage.getByRole("heading", { name: /Phạm Thử việc/i }).first(),
    ).toBeVisible();
    await expect(adminPage.getByText("079090000004")).toBeVisible();
    await expect(adminPage.getByText(/190300000004/)).toBeVisible();
    await expect(adminPage.getByText("8000000004")).toBeVisible();
    const pageContent = await adminPage.content();
    expect(pageContent).not.toContain("v1:");

    // 3. Execute Probation Evaluation (extend probation) via UI dialog
    const evalBtn = adminPage.getByRole("button", {
      name: /Đánh giá \/ Gia hạn thử việc/i,
    });
    await expect(evalBtn).toBeVisible();
    await evalBtn.click();

    const dialog = adminPage.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Select 'extend' (Gia hạn thêm thời gian thử việc)
    await dialog.getByRole("combobox").click();
    await adminPage
      .getByRole("option", { name: /Gia hạn thêm thời gian thử việc/i })
      .click();

    await dialog.locator('input[type="date"]').fill(nextProbationEnd);
    await dialog
      .locator("textarea")
      .fill(`Gia hạn thử việc qua E2E-2 đến ${nextProbationEnd}`);
    await dialog
      .getByRole("button", { name: /Xác nhận quyết định/i })
      .click();

    await expect(dialog).toBeHidden();
    await expect(
      adminPage.getByText(new RegExp(expectedVnDate)).first(),
    ).toBeVisible();

    // Reload to verify DB persistence
    await adminPage.reload();
    await expect(
      adminPage.getByText(new RegExp(expectedVnDate)).first(),
    ).toBeVisible();
  });

  test("Standard Employee updates self-service profile on /account/profile and submits resignation request", async ({
    employeePage,
    adminPage,
  }) => {
    // 1. Navigate to /account/profile and verify self-service profile details
    await employeePage.goto("/account/profile");
    await expect(employeePage).toHaveURL(/\/account\/profile/);
    await expect(employeePage.getByText("EMP-STD-01")).toBeVisible();

    // 2. Open Self-Service Profile Edit Dialog and update contact details
    const editBtn = employeePage.getByRole("button", {
      name: /Cập nhật thông tin liên hệ/i,
    });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const editDialog = employeePage.getByRole("dialog");
    await expect(editDialog).toBeVisible();

    const uniqueAddress = `789 Nguyễn Huệ, Quận 1, TP.HCM (E2E-${Date.now()})`;
    const uniqueEmergencyName = "Lê Văn Bảo (Liên hệ E2E)";

    await editDialog.locator("textarea").fill(uniqueAddress);
    await editDialog
      .getByPlaceholder("Họ và tên người thân")
      .fill(uniqueEmergencyName);
    await editDialog.getByRole("button", { name: /^Lưu$/i }).click();

    await expect(editDialog).toBeHidden();
    await expect(employeePage.getByText(uniqueAddress)).toBeVisible();

    // Reload and verify persistence across page reload
    await employeePage.reload();
    await expect(employeePage.getByText(uniqueAddress)).toBeVisible();

    // 3. Submit Self-Service Resignation Request via UI dialog
    const resignBtn = employeePage.getByRole("button", {
      name: /Gửi đơn xin nghỉ việc/i,
    });
    await expect(resignBtn).toBeVisible();
    await resignBtn.click();

    const resignDialog = employeePage.getByRole("dialog");
    await expect(resignDialog).toBeVisible();

    await resignDialog.locator('input[type="date"]').first().fill("2026-12-31");
    await resignDialog.locator('input[type="date"]').nth(1).fill("2026-12-31");
    await resignDialog
      .locator("textarea")
      .fill("Thay đổi kế hoạch cá nhân (Kiểm thử E2E-2)");
    await resignDialog
      .getByRole("button", { name: /Gửi đơn xin nghỉ/i })
      .click();

    await expect(resignDialog).toBeHidden();

    // 4. Verify HR Admin sees the updated emergency contact + scheduled termination banner on EMP-STD-01 and cancels it cleanly
    await adminPage.goto("/employees");
    await expect(adminPage.getByRole("cell", { name: "EMP-STD-01" })).toBeVisible();
    await adminPage.getByRole("cell", { name: "EMP-STD-01" }).click();
    await adminPage.getByRole("link", { name: /Mở hồ sơ đầy đủ/i }).click();

    await expect(adminPage.getByText(uniqueAddress)).toBeVisible();
    await expect(adminPage.getByText(uniqueEmergencyName)).toBeVisible();
    await expect(
      adminPage.getByText(/Đã lên lịch chấm dứt hợp đồng lao động/i),
    ).toBeVisible();
    await expect(
      adminPage.getByText(/Thay đổi kế hoạch cá nhân \(Kiểm thử E2E-2\)/i),
    ).toBeVisible();

    const cancelTermBtn = adminPage.getByRole("button", {
      name: /Huỷ lịch chấm dứt/i,
    });
    await expect(cancelTermBtn).toBeVisible();
    await cancelTermBtn.click();

    await expect(
      adminPage.getByText(/Đã lên lịch chấm dứt hợp đồng lao động/i),
    ).toHaveCount(0);
  });
});
