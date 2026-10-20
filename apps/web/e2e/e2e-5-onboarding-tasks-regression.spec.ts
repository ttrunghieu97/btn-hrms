import { test, expect } from './fixtures';

test.describe('E2E-5: Onboarding Workflows & Task Templates End-to-End', () => {
  test('HR Admin creates an Onboarding Template, initiates an Onboarding Process, and completes checklist items to finish onboarding', async ({
    adminPage,
  }) => {
    const suffix = Date.now().toString().slice(-6);
    const templateName = `E2E Onboarding Template ${suffix}`;

    await adminPage.goto('/onboarding?tab=templates');
    await expect(
      adminPage.getByRole('tab', { name: 'Mẫu Template' }),
    ).toBeVisible();

    // Open Create Template dialog
    await adminPage
      .locator('button')
      .filter({ hasText: /Tạo mẫu|Thêm mẫu/i })
      .first()
      .click();
    const tplDialog = adminPage.getByRole('dialog');
    await expect(tplDialog).toBeVisible();

    await tplDialog.locator('#tpl-name').fill(templateName);

    const createTplPromise = adminPage.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/onboarding/templates') &&
        res.request().method() === 'POST',
    );
    await tplDialog
      .getByRole('button', { name: /Tạo mới|Tạo|Lưu/i })
      .click();
    const createTplRes = await createTplPromise;
    expect([200, 201]).toContain(createTplRes.status());
    await expect(tplDialog).toBeHidden();

    // Verify template row in table
    const tplRow = adminPage
      .locator('tbody tr')
      .filter({ hasText: templateName })
      .first();
    await expect(tplRow).toBeVisible();
    await expect(tplRow).toContainText('Hội nhập');

    // Switch to 'Quy trình' tab and initiate an onboarding process
    await adminPage.getByRole('tab', { name: 'Quy trình' }).click();
    await expect(
      adminPage.getByRole('heading', { name: 'Quy trình Onboarding' }),
    ).toBeVisible();

    await adminPage
      .getByRole('button', { name: 'Khởi tạo Onboarding' })
      .click();
    const procDialog = adminPage.getByRole('dialog');
    await expect(
      procDialog.getByRole('heading', {
        name: 'Khởi tạo quy trình Onboarding',
      }),
    ).toBeVisible();

    // Select employee
    await procDialog.locator('#onboarding-employee').click();
    await adminPage
      .getByRole('option', { name: /EMP-PROB-01|EMP-STD-01/ })
      .first()
      .click();

    // Select the newly created template
    await procDialog.locator('#onboarding-template').click();
    await adminPage.getByRole('option', { name: templateName }).first().click();

    const createProcPromise = adminPage.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/onboarding/processes') &&
        res.request().method() === 'POST',
    );
    await procDialog.getByRole('button', { name: 'Khởi tạo' }).click();
    const createProcRes = await createProcPromise;
    expect([200, 201]).toContain(createProcRes.status());
    const createdProcBody = (await createProcRes.json()) as {
      data?: { id?: string };
      id?: string;
    };
    const processId = createdProcBody.data?.id ?? createdProcBody.id;
    expect(processId).toBeTruthy();
    await expect(procDialog).toBeHidden();

    // Navigate to the created process detail view
    await adminPage.goto(`/onboarding?id=${processId}`);
    await expect(
      adminPage.getByText('Checklist Hội nhập'),
    ).toBeVisible();
    await expect(
      adminPage.getByText('Bàn giao thiết bị & tài khoản hệ thống'),
    ).toBeVisible();

    // Complete the checklist item
    const completeItemPromise = adminPage.waitForResponse(
      (res) =>
        res.url().includes(`/api/v1/onboarding/processes/${processId}/items/`) &&
        res.url().includes('/complete') &&
        res.request().method() === 'POST',
    );
    await adminPage
      .getByRole('button', { name: 'Hoàn thành' })
      .first()
      .click();
    const completeItemRes = await completeItemPromise;
    expect([200, 201]).toContain(completeItemRes.status());

    // Verify checklist progress updates to 1/1 and 'Mở lại' button appears
    await expect(
      adminPage.getByText('1/1 mục đã hoàn thành'),
    ).toBeVisible();
    await expect(
      adminPage.getByRole('button', { name: 'Mở lại' }).first(),
    ).toBeVisible();
  });

  test('HR Admin creates a Task Template, instantiates a Task from it, updates checklist progress in Task Detail, and views Kanban board', async ({
    adminPage,
  }) => {
    const suffix = Date.now().toString().slice(-6);
    const tplTitle = `E2E Task Template ${suffix}`;

    await adminPage.goto('/tasks?tab=templates');
    await expect(
      adminPage.getByText('Quản lý Mẫu công việc (Task Templates)'),
    ).toBeVisible();

    await adminPage
      .getByRole('button', { name: 'Thêm mẫu công việc' })
      .click();
    const dialog = adminPage.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Tạo mẫu công việc mới' }),
    ).toBeVisible();

    await dialog.locator('#tpl-title').fill(tplTitle);
    await dialog
      .locator('#tpl-desc')
      .fill('Quy trình kiểm tra hồ sơ nhân sự tự động E2E');
    await dialog
      .locator('#tpl-checklist')
      .fill('Rà soát hợp đồng lao động\nCập nhật mã số thuế TNCN');

    const createTplPromise = adminPage.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/tasks/templates') &&
        res.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Tạo mẫu' }).click();
    const createTplRes = await createTplPromise;
    expect([200, 201]).toContain(createTplRes.status());
    await expect(dialog).toBeHidden();

    // Verify template appears in table with '2 mục'
    const tplRow = adminPage
      .locator('tbody tr')
      .filter({ hasText: tplTitle })
      .first();
    await expect(tplRow).toBeVisible();
    await expect(tplRow).toContainText('2 mục');

    // Instantiate a task from the template
    const instantiatePromise = adminPage.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/tasks/templates/') &&
        res.url().includes('/instantiate') &&
        res.request().method() === 'POST',
    );
    await tplRow.getByRole('button', { name: 'Khởi tạo việc' }).click();
    const instantiateRes = await instantiatePromise;
    expect([200, 201]).toContain(instantiateRes.status());

    // Switch to 'Tất cả công việc' tab and open the instantiated task
    await adminPage.getByRole('tab', { name: /Tất cả/i }).click();
    const taskRow = adminPage
      .locator('tbody tr')
      .filter({ hasText: tplTitle })
      .first();
    await expect(taskRow).toBeVisible();
    await taskRow.getByRole('button', { name: tplTitle }).click();

    // Verify TaskDetailSheet opens and displays checklist items
    const detailSheet = adminPage.getByRole('dialog');
    await expect(detailSheet).toBeVisible();
    await expect(
      detailSheet.getByText('Rà soát hợp đồng lao động'),
    ).toBeVisible();

    // Toggle the first checklist item checkbox and verify PATCH /api/v1/tasks/:id succeeds
    const patchTaskPromise = adminPage.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/tasks/') &&
        res.request().method() === 'PATCH',
    );
    await detailSheet.getByRole('checkbox').first().click();
    const patchTaskRes = await patchTaskPromise;
    expect(patchTaskRes.status()).toBe(200);

    // Close the detail sheet and switch to Kanban tab
    await adminPage.keyboard.press('Escape');
    await adminPage.getByRole('tab', { name: /Kanban/i }).click();
    await expect(adminPage.getByText(tplTitle).first()).toBeVisible();
  });

  test('HR Admin verifies Offboarding, Learning Courses, and Organization Departments views render live data cleanly', async ({
    adminPage,
  }) => {
    await adminPage.goto('/offboarding');
    await expect(adminPage.locator('main')).toContainText(/Offboarding|Thôi việc/i);

    await adminPage.goto('/learning/courses');
    await expect(adminPage.locator('main')).toContainText(/Khóa học|Đào tạo/i);

    await adminPage.goto('/organization/departments');
    await expect(adminPage.locator('main')).toContainText(/Phòng ban|Engineering/i);
  });
});
