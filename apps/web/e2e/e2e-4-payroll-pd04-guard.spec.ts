import { test, expect } from './fixtures';

test.describe('E2E-4: Payroll Provisional Calculation & PD-04 Fail-Closed Guard', () => {
  test('HR Admin creates/opens payroll run for PP-2026-10, calculates provisional payslips, and verifies PROVISIONAL_POLICY_UNCONFIRMED UI indicators', async ({
    adminPage,
  }) => {
    const existingRunsRes = await adminPage.request.get(
      '/api/v1/payroll/runs?limit=50',
    );
    expect(existingRunsRes.status()).toBe(200);
    const existingRunsBody = (await existingRunsRes.json()) as {
      data?:
        | { rows?: Array<{ payrollPeriod?: { code?: string } }> }
        | Array<{ payrollPeriod?: { code?: string } }>;
    };
    const existingRuns = Array.isArray(existingRunsBody.data)
      ? existingRunsBody.data
      : existingRunsBody.data?.rows ?? [];
    const hasPp202610Run = existingRuns.some(
      (r) => r.payrollPeriod?.code === 'PP-2026-10',
    );

    await adminPage.goto('/payroll/runs');
    await expect(
      adminPage.getByRole('button', { name: 'Tạo bảng lương' }),
    ).toBeVisible();

    if (!hasPp202610Run) {
      await adminPage.getByRole('button', { name: 'Tạo bảng lương' }).click();
      const dialog = adminPage.getByRole('dialog');
      await expect(
        dialog.getByRole('heading', { name: 'Tạo bảng lương' }),
      ).toBeVisible();

      await dialog.getByRole('combobox').click();
      await adminPage
        .getByRole('option', { name: /PP-2026-10/ })
        .first()
        .click();

      const createRunPromise = adminPage.waitForResponse(
        (res) =>
          res.url().includes('/api/v1/payroll/runs') &&
          res.request().method() === 'POST',
      );
      await dialog.getByRole('button', { name: 'Tạo mới' }).click();
      const createRes = await createRunPromise;
      expect(createRes.status()).toBe(201);
      await expect(dialog).toBeHidden();
    }

    const runRow = adminPage
      .locator('tbody tr')
      .filter({ hasText: 'PP-2026-10' })
      .first();
    await expect(runRow).toBeVisible();

    await runRow
      .getByRole('button', { name: 'Xem chi tiết bảng lương' })
      .click();
    await expect(adminPage).toHaveURL(/\/payroll\/runs\/[0-9a-f-]{36}$/);

    // Verify the provisional badge and PD-04 banner render on the payroll run detail page
    const provisionalBadge = adminPage.getByTestId('payroll-provisional-badge');
    await expect(provisionalBadge).toBeVisible();
    await expect(provisionalBadge).toContainText(
      'PROVISIONAL_POLICY_UNCONFIRMED',
    );
    await expect(
      adminPage.getByText(
        /Chế độ tính lương tạm tính \(Provisional Calculation — PD-04\)/,
      ),
    ).toBeVisible();

    // Trigger provisional payslip calculation if the run is still in 'draft'
    const calculateBtn = adminPage.getByRole('button', {
      name: 'Tính toán phiếu lương',
    });
    if (await calculateBtn.isVisible()) {
      const generateResponsePromise = adminPage.waitForResponse(
        (res) =>
          res.url().includes('/api/v1/payroll/runs/') &&
          res.url().includes('/generate') &&
          res.request().method() === 'POST',
      );
      await calculateBtn.click();
      const generateRes = await generateResponsePromise;
      expect([200, 201]).toContain(generateRes.status());
    }

    // After calculation, the run transitions to pending_approval and remains PROVISIONAL_POLICY_UNCONFIRMED
    await expect(provisionalBadge).toContainText(
      'PROVISIONAL_POLICY_UNCONFIRMED',
    );

    // Verify 'Phê duyệt bảng lương' button is rendered and disabled due to PD-04 guard
    const approveRunBtn = adminPage.getByRole('button', {
      name: 'Phê duyệt bảng lương',
    });
    await expect(approveRunBtn).toBeVisible();
    await expect(approveRunBtn).toBeDisabled();

    // Navigate to /payroll/payslips and verify generated provisional payslips
    await adminPage.goto('/payroll/payslips');
    const firstPayslipRow = adminPage
      .locator('tbody tr')
      .filter({ hasText: 'Tạm tính (PD-04)' })
      .first();
    await expect(firstPayslipRow).toBeVisible();

    // Verify publish icon button in table row is disabled
    await expect(
      firstPayslipRow.getByRole('button', { name: 'Công bố phiếu lương' }),
    ).toBeDisabled();

    // Open payslip detail page and verify PD-04 indicators
    await firstPayslipRow
      .getByRole('button', { name: 'Xem chi tiết phiếu lương' })
      .click();
    await expect(adminPage).toHaveURL(/\/payroll\/payslips\/[0-9a-f-]{36}$/);

    await expect(
      adminPage.getByText('Khấu trừ (Tạm tính — PD-04)'),
    ).toBeVisible();
    await expect(adminPage.getByText(/Provisional — PD-04/)).toBeVisible();
    await expect(
      adminPage.getByRole('button', { name: 'Công bố phiếu lương' }),
    ).toBeDisabled();
  });

  test('PD-04 Fail-Closed Guard rejects closing payroll period via UI and rejects direct settlement calls with 409 Conflict', async ({
    adminPage,
  }) => {
    // 1. Attempt to close payroll period PP-2026-10 via /payroll/periods UI
    await adminPage.goto('/payroll/periods');
    const periodRow = adminPage
      .locator('tbody tr')
      .filter({ hasText: 'PP-2026-10' })
      .first();
    await expect(periodRow).toBeVisible();

    await periodRow.getByRole('button', { name: 'Sửa kỳ lương' }).click();
    const dialog = adminPage.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Sửa kỳ lương' }),
    ).toBeVisible();

    await dialog
      .getByRole('combobox', { name: 'Trạng thái kỳ lương' })
      .click();
    await adminPage.getByRole('option', { name: 'Đã đóng' }).click();

    const closePeriodResponsePromise = adminPage.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/payroll/periods/') &&
        res.request().method() === 'PATCH',
    );
    await dialog.getByRole('button', { name: 'Cập nhật' }).click();
    const closePeriodRes = await closePeriodResponsePromise;
    expect(closePeriodRes.status()).toBe(409);

    const closePeriodBody = (await closePeriodRes.json()) as {
      error?: { message?: string };
      message?: string;
    };
    const errorMessage =
      closePeriodBody.error?.message ?? closePeriodBody.message ?? '';
    expect(errorMessage).toContain('provisional');

    // Close dialog cleanly and verify period was NOT closed
    await dialog.getByRole('button', { name: 'Hủy' }).click();
    await expect(dialog).toBeHidden();
    await expect(periodRow).not.toContainText('Đã đóng');
    await expect(periodRow).toContainText(/Nháp|Đang mở/);

    // 2. Verify backend PD-04 Fail-Closed Guard on payslip publish and payroll run settlement endpoints
    await adminPage.goto('/payroll/runs');
    const runRow = adminPage
      .locator('tbody tr')
      .filter({ hasText: 'PP-2026-10' })
      .first();
    await expect(runRow).toBeVisible();
    await runRow
      .getByRole('button', { name: 'Xem chi tiết bảng lương' })
      .click();
    await expect(adminPage).toHaveURL(/\/payroll\/runs\/[0-9a-f-]{36}$/);

    const runId = adminPage.url().split('/').pop()!;

    // Extract CSRF token from cookies to test authenticated mutation endpoints directly via browser context
    const cookies = await adminPage.context().cookies();
    const csrfToken =
      cookies.find((c) => c.name === 'hrms_csrf_token')?.value ?? '';

    // Get a provisional payslip ID from the run and attempt to publish it directly
    const payslipsListRes = await adminPage.request.get(
      `/api/v1/payroll/payslips?payrollRunId=${runId}&limit=5`,
    );
    expect(payslipsListRes.status()).toBe(200);
    const payslipsListData = (await payslipsListRes.json()) as {
      data?: { rows?: Array<{ id: string }> } | Array<{ id: string }>;
    };
    const payslipRows = Array.isArray(payslipsListData.data)
      ? payslipsListData.data
      : payslipsListData.data?.rows ?? [];
    expect(payslipRows.length).toBeGreaterThan(0);

    const payslipId = payslipRows[0]!.id;
    const publishRes = await adminPage.request.patch(
      `/api/v1/payroll/payslips/${payslipId}/publish`,
      {
        headers: { 'x-csrf-token': csrfToken },
        data: { status: 'published' },
      },
    );
    expect(publishRes.status()).toBe(409);
    const publishJson = JSON.stringify(await publishRes.json());
    expect(publishJson).toContain('BIZ_004_PAYROLL_POLICY_UNCONFIRMED');

    // Direct approve and post settlement attempts on the unconfirmed run are also rejected
    const approveRes = await adminPage.request.post(
      `/api/v1/payroll/runs/${runId}/approve`,
      {
        headers: { 'x-csrf-token': csrfToken },
        data: {},
      },
    );
    expect([403, 409]).toContain(approveRes.status());

    const postRes = await adminPage.request.post(
      `/api/v1/payroll/runs/${runId}/post`,
      {
        headers: { 'x-csrf-token': csrfToken },
        data: {},
      },
    );
    expect([400, 403, 409]).toContain(postRes.status());
  });
});
