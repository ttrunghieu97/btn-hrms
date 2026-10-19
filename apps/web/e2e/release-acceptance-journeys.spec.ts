import { test, expect, type Page } from '@playwright/test';
import http from 'node:http';

test.use({ storageState: { cookies: [], origins: [] } });

type RoleKey = 'admin' | 'hr_manager' | 'dept_manager' | 'self_employee';

interface RecordedRequest {
  method: string;
  url: string;
  body: Record<string, unknown> | null;
}

const ROLE_USERS: Record<RoleKey, Record<string, unknown>> = {
  admin: {
    id: 'user-admin-1',
    username: 'admin',
    email: 'admin@example.com',
    employeeId: 'emp-admin-1',
    roles: ['ADMIN'],
    permissions: ['ALL', 'sys:all'],
    isSuperAdmin: true,
  },
  hr_manager: {
    id: 'user-hr-1',
    username: 'hr.manager',
    email: 'hr.manager@example.com',
    employeeId: 'emp-hr-1',
    roles: ['HR_MANAGER'],
    permissions: [
      'employee:view',
      'employee:view:all',
      'employee:create',
      'employee:edit',
      'employee:delete',
      'employee:manage',
      'employee:read:sensitive',
      'employee:manage:sensitive',
      'recruitment:read',
      'recruitment:manage',
      'onboarding:read',
      'onboarding:manage',
      'offboarding:read',
      'offboarding:manage',
      'leave:view',
      'leave:approve',
      'leave:manage',
      'expense:read',
      'expense:manage',
      'expenses:view',
      'expenses:manage',
      'benefit:read',
      'benefit:manage',
      'benefits:view',
      'benefits:manage',
      'payroll:read',
      'payroll:view:all',
      'payroll:edit',
      'payroll:manage',
      'payroll:manage:all',
      'payroll:manage_periods',
      'payroll:manage_payslips',
      'payroll:approve',
      'payroll:post',
      'payroll:publish',
      'attendance:view:self',
      'attendance:view:department',
      'attendance:view:all',
      'attendance:report',
      'attendance:timesheet:view',
      'attendance:timesheet:manage',
      'attendance:timesheet:approve',
      'attendance:period:view',
      'attendance:period:review',
      'attendance:period:approve',
      'attendance:period:lock',
      'attendance:period:unlock',
      'attendance:period:close',
    ],
    isSuperAdmin: false,
  },
  dept_manager: {
    id: 'user-mgr-1',
    username: 'dept.manager',
    email: 'dept.manager@example.com',
    employeeId: 'emp-mgr-1',
    roles: ['MANAGER'],
    permissions: [
      'employee:view',
      'employee:view:department',
      'employee:edit',
      'onboarding:read',
      'offboarding:read',
      'leave:view',
      'leave:request',
      'leave:approve',
      'expense:read',
      'expense:submit',
      'expenses:view',
      'expenses:submit',
      'benefit:read',
      'benefits:view',
      'attendance:view:self',
      'attendance:view:department',
    ],
    isSuperAdmin: false,
  },
  self_employee: {
    id: 'user-self-1',
    username: 'self.employee',
    email: 'self.employee@example.com',
    employeeId: 'emp-self-1',
    roles: ['EMPLOYEE'],
    permissions: [
      'employee:view:self',
      'onboarding:read',
      'leave:view',
      'leave:request',
      'expense:read',
      'expense:submit',
      'expenses:view',
      'expenses:submit',
      'benefit:read',
      'benefits:view',
      'benefits:enroll',
      'attendance:view:self',
      'attendance:check',
    ],
    isSuperAdmin: false,
  },
};

const MOCK_API_PORT = Number(process.env.E2E_API_PORT || 3001);
const routedPages = new WeakSet<Page>();

async function setRoleSession(page: Page, role: RoleKey) {
  if (MOCK_API_PORT !== 3001 && !routedPages.has(page)) {
    routedPages.add(page);
    await page.route(/\/api\/v1\/.*/, async (route) => {
      const req = route.request();
      const parsed = new URL(req.url());
      const targetUrl = `http://127.0.0.1:${MOCK_API_PORT}${parsed.pathname}${parsed.search}`;
      const response = await route.fetch({ url: targetUrl });
      await route.fulfill({ response });
    });
  }
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: 'access_token',
      value: `token-${role}`,
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'refresh_token',
      value: `refresh-${role}`,
      domain: 'localhost',
      path: '/',
    },
  ]);
}

test.describe('HRMS Release Closure — 11 Critical Browser E2E Journeys', () => {
  let apiServer: http.Server;
  let recordedRequests: RecordedRequest[] = [];

  // Mutable state reset before each test
  let state: {
    offerStatus: 'approved' | 'accepted';
    onboardingCompleted: boolean;
    transferStage: 'manager_approval' | 'hr_approval' | 'completed';
    transferDeptName: string;
    terminatedEmployeeStatus: 'working' | 'terminated';
    offboardingStatus: 'awaiting_settlement' | 'completed';
    archivedWorkingDeletedAt: string | null;
    rehiredEmployeeStatus: 'terminated' | 'working';
    subordinateLeaveApproved: boolean;
    expenseStatus: 'draft' | 'submitted' | 'approved' | 'reimbursed';
    benefitEnrollments: Array<{
      id: string;
      employeeId: string;
      employeeName: string;
      planId: string;
      planName: string;
      status: string;
      coverageType: string;
      effectiveFrom: string;
      enrolledAt: string;
    }>;
    attendancePeriodStatus: 'open' | 'in_review' | 'locked' | 'closed';
    attendancePeriodHistory: Array<{
      id: string;
      period: string;
      fromStatus: string;
      toStatus: string;
      changedByUserId: string;
      reason: string | null;
      createdAt: string;
    }>;
  };

  function resetState() {
    recordedRequests = [];
    state = {
      offerStatus: 'approved',
      onboardingCompleted: false,
      transferStage: 'manager_approval',
      transferDeptName: 'Phòng Kỹ thuật (Engineering)',
      terminatedEmployeeStatus: 'working',
      offboardingStatus: 'awaiting_settlement',
      archivedWorkingDeletedAt: '2026-10-10T08:00:00.000Z',
      rehiredEmployeeStatus: 'terminated',
      subordinateLeaveApproved: false,
      expenseStatus: 'draft',
      benefitEnrollments: [
        {
          id: 'ben-enr-1',
          employeeId: 'emp-self-1',
          employeeName: 'Lê Hoàng Phúc Lợi (EMP-SELF)',
          planId: 'plan-1',
          planName: 'Bảo hiểm Sức khỏe Toàn diện PVI',
          status: 'pending',
          coverageType: 'employee_only',
          effectiveFrom: '2026-10-01',
          enrolledAt: '2026-10-01T08:00:00.000Z',
        },
      ],
      attendancePeriodStatus: 'open',
      attendancePeriodHistory: [],
    };
  }

  test.beforeAll(async () => {
    resetState();
    apiServer = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        let parsedBody: Record<string, unknown> | null = null;
        if (rawBody) {
          try {
            parsedBody = JSON.parse(rawBody) as Record<string, unknown>;
          } catch {
            parsedBody = null;
          }
        }

        const urlObj = new URL(req.url ?? '/', 'http://127.0.0.1:3001');
        const pathname = urlObj.pathname;
        const method = req.method ?? 'GET';

        recordedRequests.push({
          method,
          url: `${pathname}${urlObj.search}`,
          body: parsedBody,
        });

        const sendJson = (status: number, payload: unknown) => {
          res.writeHead(status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': '*',
          });
          res.end(JSON.stringify(payload));
        };

        if (method === 'OPTIONS') {
          sendJson(200, {});
          return;
        }

        // Auth session endpoint used by Next.js SSR requireServerSession()
        if (pathname === '/api/v1/users/me') {
          const authHeader = req.headers.authorization ?? '';
          const cookieHeader = req.headers.cookie ?? '';
          let role: RoleKey = 'admin';
          for (const candidate of ['admin', 'hr_manager', 'dept_manager', 'self_employee'] as const) {
            if (
              authHeader.includes(`token-${candidate}`) ||
              cookieHeader.includes(`token-${candidate}`)
            ) {
              role = candidate;
              break;
            }
          }
          sendJson(200, { data: ROLE_USERS[role] });
          return;
        }

        // Organization lookups
        if (pathname === '/api/v1/organization/departments') {
          sendJson(200, {
            data: [
              { id: 'dept-eng', name: 'Phòng Kỹ thuật (Engineering)' },
              { id: 'dept-prod', name: 'Phòng Sản phẩm (Product)' },
            ],
          });
          return;
        }
        if (pathname === '/api/v1/organization/positions') {
          sendJson(200, {
            data: [
              { id: 'pos-se', name: 'Kỹ sư Phần mềm (Software Engineer)', isActive: true },
              { id: 'pos-pm', name: 'Quản lý Sản phẩm (Product Manager)', isActive: true },
            ],
          });
          return;
        }

        // ── Journey 1: Recruitment Candidates & Offer Decision ──────────────
        if (pathname === '/api/v1/recruitment/applications' && method === 'GET') {
          sendJson(200, {
            data: [
              {
                id: 'app-1',
                candidateId: 'cand-1',
                currentStage: state.offerStatus === 'accepted' ? 'hired' : 'offer',
                candidate: {
                  id: 'cand-1',
                  fullName: 'Nguyễn Minh Khoa',
                  email: 'khoa.nguyen@example.com',
                  phone: '0901234567',
                },
              },
            ],
          });
          return;
        }
        if (pathname === '/api/v1/recruitment/applications/app-1' && method === 'GET') {
          sendJson(200, {
            data: {
              id: 'app-1',
              candidateId: 'cand-1',
              currentStage: state.offerStatus === 'accepted' ? 'hired' : 'offer',
              candidate: {
                id: 'cand-1',
                fullName: 'Nguyễn Minh Khoa',
                email: 'khoa.nguyen@example.com',
                phone: '0901234567',
              },
            },
          });
          return;
        }
        if (pathname === '/api/v1/recruitment/interviews' && method === 'GET') {
          sendJson(200, { data: [] });
          return;
        }
        if (pathname === '/api/v1/recruitment/offers' && method === 'GET') {
          sendJson(200, {
            data: [
              {
                id: 'offer-1',
                applicationId: 'app-1',
                compensation: '25,000,000 VND',
                startDate: '2026-11-01',
                status: state.offerStatus,
              },
            ],
          });
          return;
        }
        if (pathname === '/api/v1/recruitment/offers/offer-1/decision' && method === 'POST') {
          state.offerStatus = 'accepted';
          sendJson(200, {
            data: {
              id: 'offer-1',
              applicationId: 'app-1',
              compensation: '25,000,000 VND',
              startDate: '2026-11-01',
              status: 'accepted',
            },
          });
          return;
        }

        // ── Journey 2: Onboarding Task Completion ──────────────────────────
        if (pathname === '/api/v1/onboarding/processes/onb-proc-1' && method === 'GET') {
          sendJson(200, {
            data: {
              id: 'onb-proc-1',
              employeeId: 'Nguyễn Minh Khoa (EMP-101)',
              templateId: 'tpl-1',
              type: 'onboarding',
              status: state.onboardingCompleted ? 'completed' : 'in_progress',
              startDate: '2026-10-01',
              targetEndDate: '2026-10-15',
              completedAt: state.onboardingCompleted ? '2026-10-16T08:00:00.000Z' : null,
              assignedHrUserId: 'Chuyên viên HR',
              createdAt: '2026-10-01T08:00:00.000Z',
              updatedAt: '2026-10-16T08:00:00.000Z',
              checklistItems: [
                {
                  id: 'item-1',
                  title: 'Cấp phát tài khoản Email & Laptop',
                  dueDaysOffset: 1,
                  mandatory: true,
                  dueDate: '2026-10-02',
                  isCompleted: true,
                  completedAt: '2026-10-02T09:00:00.000Z',
                  completedByUserID: 'user-hr-1',
                  status: 'completed',
                },
                {
                  id: 'item-2',
                  title: 'Ký hợp đồng thử việc & NDA',
                  dueDaysOffset: 3,
                  mandatory: true,
                  dueDate: '2026-10-04',
                  isCompleted: state.onboardingCompleted,
                  completedAt: state.onboardingCompleted ? '2026-10-16T08:00:00.000Z' : null,
                  completedByUserID: state.onboardingCompleted ? 'user-mgr-1' : null,
                  status: state.onboardingCompleted ? 'completed' : 'pending',
                },
              ],
            },
          });
          return;
        }
        if (
          pathname === '/api/v1/onboarding/processes/onb-proc-1/items/item-2/complete' &&
          method === 'POST'
        ) {
          state.onboardingCompleted = true;
          sendJson(200, {
            data: {
              id: 'item-2',
              status: 'completed',
              isCompleted: true,
            },
          });
          return;
        }

        // ── Journey 3, 4, 5: Employees & Lifecycle / Transfers / Archive / Rehire ──
        if (pathname === '/api/v1/employees' && method === 'GET') {
          const tab = urlObj.searchParams.get('tab');
          if (tab === 'deleted') {
            const deletedList = [];
            if (state.archivedWorkingDeletedAt) {
              deletedList.push({
                id: 'emp-archived-1',
                employeeCode: 'EMP-ARC-01',
                firstName: 'Lưu Trữ',
                lastName: 'Trần Văn',
                username: 'tran.luutru',
                email: 'luutru@example.com',
                status: 'working',
                deletedAt: state.archivedWorkingDeletedAt,
                allowedTransitions: ['leave', 'suspended', 'terminated'],
                department: { id: 'dept-eng', name: 'Phòng Kỹ thuật (Engineering)' },
                position: { id: 'pos-se', name: 'Kỹ sư Phần mềm', isActive: true },
              });
            }
            deletedList.push({
              id: 'emp-archived-term-1',
              employeeCode: 'EMP-ARC-02',
              firstName: 'Đã Nghỉ',
              lastName: 'Lê Thị',
              username: 'le.danghi',
              email: 'danghi@example.com',
              status: 'terminated',
              deletedAt: '2026-10-05T08:00:00.000Z',
              allowedTransitions: [],
              department: { id: 'dept-eng', name: 'Phòng Kỹ thuật (Engineering)' },
              position: { id: 'pos-se', name: 'Kỹ sư Phần mềm', isActive: true },
            });
            sendJson(200, {
              data: deletedList,
              meta: { total: deletedList.length },
            });
            return;
          }
          sendJson(200, {
            data: [
              {
                id: 'emp-self-1',
                employeeCode: 'EMP-SELF',
                firstName: 'Phúc Lợi',
                lastName: 'Lê Hoàng',
                username: 'self.employee',
                email: 'self.employee@example.com',
                status: 'working',
                deletedAt: null,
                allowedTransitions: ['leave', 'suspended', 'terminated'],
                department: { id: 'dept-eng', name: 'Phòng Kỹ thuật (Engineering)' },
                position: { id: 'pos-se', name: 'Kỹ sư Phần mềm', isActive: true },
              },
            ],
            meta: { total: 1 },
          });
          return;
        }

        const empMatch = pathname.match(/^\/api\/v1\/employees\/([^/]+)$/);
        if (empMatch && method === 'GET') {
          const empId = empMatch[1];
          if (empId === 'emp-transfer-1') {
            sendJson(200, {
              data: {
                id: 'emp-transfer-1',
                employeeCode: 'EMP-TRF-01',
                firstName: 'Điều Chuyển',
                lastName: 'Phạm Hữu',
                username: 'pham.dieuchuyen',
                email: 'dieuchuyen@example.com',
                status: 'working',
                deletedAt: null,
                allowedTransitions: ['leave', 'suspended', 'retired', 'terminated'],
                department: {
                  id: state.transferStage === 'completed' ? 'dept-prod' : 'dept-eng',
                  name: state.transferDeptName,
                },
                position: { id: 'pos-se', name: 'Kỹ sư Phần mềm', isActive: true },
              },
            });
            return;
          }
          if (empId === 'emp-term-1') {
            sendJson(200, {
              data: {
                id: 'emp-term-1',
                employeeCode: 'EMP-TRM-01',
                firstName: 'Thôi Việc',
                lastName: 'Vũ Minh',
                username: 'vu.thoiviec',
                email: 'thoiviec@example.com',
                status: state.terminatedEmployeeStatus,
                deletedAt: null,
                allowedTransitions:
                  state.terminatedEmployeeStatus === 'working'
                    ? ['leave', 'suspended', 'retired', 'terminated']
                    : [],
                department: { id: 'dept-eng', name: 'Phòng Kỹ thuật (Engineering)' },
                position: { id: 'pos-se', name: 'Kỹ sư Phần mềm', isActive: true },
              },
            });
            return;
          }
          if (empId === 'emp-terminated-1') {
            sendJson(200, {
              data: {
                id: 'emp-terminated-1',
                employeeCode: 'EMP-REH-01',
                firstName: 'Tái Tuyển',
                lastName: 'Đặng Quốc',
                username: 'dang.taituyen',
                email: 'taituyen@example.com',
                status: state.rehiredEmployeeStatus,
                deletedAt: null,
                allowedTransitions:
                  state.rehiredEmployeeStatus === 'working'
                    ? ['leave', 'suspended', 'retired', 'terminated']
                    : [],
                department: { id: 'dept-eng', name: 'Phòng Kỹ thuật (Engineering)' },
                position: { id: 'pos-se', name: 'Kỹ sư Phần mềm', isActive: true },
              },
            });
            return;
          }
        }

        // Workflow instances lookup (used by fetchEmployeeWorkflowInstances)
        const wfMatch = pathname.match(/^\/api\/v1\/employees\/([^/]+)\/workflow-instances$/);
        if (
          (pathname === '/api/v1/workflow-instances' || wfMatch) &&
          method === 'GET'
        ) {
          const empId = wfMatch ? wfMatch[1] : urlObj.searchParams.get('subjectId');
          if (empId === 'emp-transfer-1' && state.transferStage !== 'completed') {
            sendJson(200, {
              data: [
                {
                  id: 'wf-transfer-1',
                  workflowCode: 'EMPLOYEE_TRANSFER_V1',
                  subjectType: 'employee_transfer',
                  subjectId: 'emp-transfer-1',
                  status: 'active',
                  currentState: state.transferStage,
                  metadata: {
                    toDepartmentId: 'dept-prod',
                    toJobTitle: 'Quản lý Sản phẩm',
                    effectiveDate: '2026-11-01',
                  },
                },
              ],
            });
            return;
          }
          sendJson(200, { data: [] });
          return;
        }

        // Boarding status lookups (used by fetchEmployeeBoardingStatus)
        if (pathname === '/api/v1/onboarding/processes' && method === 'GET') {
          sendJson(200, { data: [] });
          return;
        }
        if (pathname === '/api/v1/offboarding' && method === 'GET') {
          const employeeId = urlObj.searchParams.get('employeeId');
          if (employeeId === 'emp-term-1' && state.terminatedEmployeeStatus === 'terminated') {
            sendJson(200, {
              data: [
                {
                  id: 'off-proc-1',
                  employeeId: 'emp-term-1',
                  status: state.offboardingStatus,
                  startDate: '2026-10-16',
                  targetEndDate: '2026-10-31',
                  completedAt:
                    state.offboardingStatus === 'completed'
                      ? '2026-10-16T10:00:00.000Z'
                      : null,
                },
              ],
            });
            return;
          }
          sendJson(200, { data: [] });
          return;
        }

        const boardingMatch = pathname.match(/^\/api\/v1\/employees\/([^/]+)\/boarding-status$/);
        if (boardingMatch && method === 'GET') {
          const empId = boardingMatch[1];
          if (empId === 'emp-term-1' && state.terminatedEmployeeStatus === 'terminated') {
            sendJson(200, {
              data: {
                onboarding: null,
                offboarding: {
                  id: 'off-proc-1',
                  status: 'in_progress',
                },
              },
            });
            return;
          }
          sendJson(200, { data: { onboarding: null, offboarding: null } });
          return;
        }

        if (pathname.endsWith('/status-history') || pathname.endsWith('/timeline')) {
          sendJson(200, { data: [] });
          return;
        }
        if (
          (pathname.endsWith('/contracts') &&
            pathname !== '/api/v1/contracts' &&
            pathname !== '/api/v1/employees/emp-transfer-1/contracts') ||
          pathname.endsWith('/compensation') ||
          pathname.endsWith('/social-insurance')
        ) {
          sendJson(200, { data: null });
          return;
        }

        // Transfer approval actions (manager-approve and hr-approve)
        if (
          pathname === '/api/v1/employees/emp-transfer-1/transfers/wf-transfer-1/manager-approve' &&
          method === 'POST'
        ) {
          state.transferStage = 'hr_approval';
          sendJson(200, {
            data: {
              instanceId: 'wf-transfer-1',
              previousState: 'manager_approval',
              newState: 'hr_approval',
            },
          });
          return;
        }
        if (
          pathname === '/api/v1/employees/emp-transfer-1/transfers/wf-transfer-1/hr-approve' &&
          method === 'POST'
        ) {
          state.transferStage = 'completed';
          state.transferDeptName = 'Phòng Sản phẩm (Product)';
          sendJson(200, {
            data: {
              instanceId: 'wf-transfer-1',
              previousState: 'hr_approval',
              newState: 'completed',
            },
          });
          return;
        }

        // Immediate Termination action (PUT /api/v1/employees/:id/terminate)
        if (
          pathname === '/api/v1/employees/emp-term-1/terminate' &&
          (method === 'PUT' || method === 'POST')
        ) {
          state.terminatedEmployeeStatus = 'terminated';
          sendJson(200, {
            data: {
              id: 'emp-term-1',
              status: 'terminated',
            },
          });
          return;
        }

        // Restore & Rehire actions
        if (pathname === '/api/v1/employees/emp-archived-1/restore' && method === 'POST') {
          state.archivedWorkingDeletedAt = null;
          sendJson(200, {
            data: {
              id: 'emp-archived-1',
              status: 'working',
              deletedAt: null,
            },
          });
          return;
        }
        if (pathname === '/api/v1/employees/emp-terminated-1/rehire' && method === 'POST') {
          state.rehiredEmployeeStatus = 'working';
          sendJson(200, {
            data: {
              id: 'emp-terminated-1',
              status: 'working',
            },
          });
          return;
        }

        // ── Journey 4 (part 2): Offboarding Process Detail & Complete ──────
        if (
          (pathname === '/api/v1/offboarding/off-proc-1' ||
            pathname === '/api/v1/offboarding/processes/off-proc-1') &&
          method === 'GET'
        ) {
          sendJson(200, {
            data: {
              id: 'off-proc-1',
              employeeId: 'Vũ Minh Thôi Việc (EMP-TRM-01)',
              status: state.offboardingStatus,
              startDate: '2026-10-16',
              targetEndDate: '2026-10-31',
              completedAt: state.offboardingStatus === 'completed' ? '2026-10-16T10:00:00.000Z' : null,
              checklistItems: [
                {
                  id: 'off-item-1',
                  title: 'Thu hồi Laptop & Thẻ từ ra vào',
                  mandatory: true,
                  status: 'completed',
                  isCompleted: true,
                  completedAt: '2026-10-16T09:00:00.000Z',
                },
              ],
              clearances: [
                {
                  id: 'clr-1',
                  department: 'IT & Security',
                  decision: 'approved',
                  decidedAt: '2026-10-16T09:30:00.000Z',
                },
              ],
              exitInterview: {
                id: 'exit-1',
                scheduledAt: '2026-10-16T09:00:00.000Z',
                conductedAt: '2026-10-16T09:15:00.000Z',
              },
              settlement: {
                status: 'settled',
                isOutstanding: false,
              },
            },
          });
          return;
        }
        if (
          (pathname === '/api/v1/offboarding/off-proc-1/complete' ||
            pathname === '/api/v1/offboarding/processes/off-proc-1/complete') &&
          method === 'POST'
        ) {
          state.offboardingStatus = 'completed';
          sendJson(200, {
            data: {
              id: 'off-proc-1',
              status: 'completed',
            },
          });
          return;
        }

        // ── Journey 6: Leave Approval & Self-Approval Prevention ────────────
        if (
          (pathname === '/api/v1/approval/inbox' || pathname === '/api/v1/approval-inbox') &&
          method === 'GET'
        ) {
          const items = [
            {
              approvalRequestId: 'apr-self-1',
              leaveRequestId: 'req-self-1',
              status: 'pending',
              requestedAt: '2026-10-15T08:00:00.000Z',
              requester: {
                id: 'emp-mgr-1',
                fullName: 'Trưởng Phòng Kỹ Thuật (Bản thân)',
                employeeCode: 'EMP-MGR-01',
                departmentName: 'Phòng Kỹ thuật',
              },
              leaveType: {
                code: 'ANNUAL',
                name: 'Nghỉ phép năm',
                isPaid: true,
              },
              startDate: '2026-10-20',
              endDate: '2026-10-21',
              totalUnits: '2',
              reason: 'Nghỉ việc riêng của quản lý',
            },
          ];
          if (!state.subordinateLeaveApproved) {
            items.push({
              approvalRequestId: 'apr-sub-1',
              leaveRequestId: 'req-sub-1',
              status: 'pending',
              requestedAt: '2026-10-15T09:00:00.000Z',
              requester: {
                id: 'emp-sub-1',
                fullName: 'Phạm Văn Nghỉ Phép',
                employeeCode: 'EMP-SUB-01',
                departmentName: 'Phòng Kỹ thuật',
              },
              leaveType: {
                code: 'ANNUAL',
                name: 'Nghỉ phép năm',
                isPaid: true,
              },
              startDate: '2026-10-22',
              endDate: '2026-10-23',
              totalUnits: '2',
              reason: 'Nghỉ phép gia đình',
            });
          }
          sendJson(200, { data: items });
          return;
        }
        if (
          (pathname === '/api/v1/approval/inbox/req-self-1/approve' ||
            pathname === '/api/v1/leave/requests/req-self-1/approve') &&
          method === 'POST'
        ) {
          sendJson(403, {
            statusCode: 403,
            errorCode: 'FORBIDDEN',
            reason: 'SELF_APPROVAL_FORBIDDEN',
            message: 'Người phê duyệt không được phép tự duyệt đơn nghỉ phép của chính mình.',
          });
          return;
        }
        if (
          (pathname === '/api/v1/approval/inbox/req-sub-1/approve' ||
            pathname === '/api/v1/leave/requests/req-sub-1/approve') &&
          method === 'POST'
        ) {
          state.subordinateLeaveApproved = true;
          sendJson(200, {
            data: {
              id: 'req-sub-1',
              status: 'approved',
            },
          });
          return;
        }
        if (
          (pathname === '/api/v1/leave/management' || pathname === '/api/v1/leave/requests') &&
          method === 'GET'
        ) {
          sendJson(200, {
            data: [
              {
                id: 'req-sub-1',
                employeeId: 'emp-sub-1',
                employeeName: 'Phạm Văn Nghỉ Phép',
                leaveTypeName: 'Nghỉ phép năm',
                startDate: '2026-10-22',
                endDate: '2026-10-23',
                totalUnits: '2',
                status: state.subordinateLeaveApproved ? 'approved' : 'pending',
                reason: 'Nghỉ phép gia đình',
              },
            ],
          });
          return;
        }
        if (pathname.startsWith('/api/v1/leave/balances')) {
          sendJson(200, { data: [] });
          return;
        }
        if (pathname.startsWith('/api/v1/leave/types')) {
          sendJson(200, { data: [{ id: 'lt-1', name: 'Nghỉ phép năm', code: 'ANNUAL' }] });
          return;
        }

        // ── Journey 7: Expense Submission, Approval, and Reimbursement ──────
        if (pathname === '/api/v1/expenses/claims' && method === 'GET') {
          sendJson(200, {
            data: [
              {
                id: 'exp-1',
                employeeId: 'emp-self-1',
                title: 'Chi phí công tác Đà Nẵng',
                description: 'Vé máy bay & khách sạn hội thảo',
                status: state.expenseStatus,
                totalAmount: '3500000',
                currency: 'VND',
                createdAt: '2026-10-15T08:00:00.000Z',
              },
            ],
            meta: { page: 1, limit: 20, total: 1 },
          });
          return;
        }
        if (pathname === '/api/v1/expenses/claims/exp-1/submit' && method === 'POST') {
          state.expenseStatus = 'submitted';
          sendJson(200, { data: { id: 'exp-1', status: 'submitted' } });
          return;
        }
        if (pathname === '/api/v1/expenses/claims/exp-1/approve' && method === 'POST') {
          state.expenseStatus = 'approved';
          sendJson(200, { data: { id: 'exp-1', status: 'approved' } });
          return;
        }
        if (pathname === '/api/v1/expenses/claims/exp-1/reimburse' && method === 'POST') {
          state.expenseStatus = 'reimbursed';
          sendJson(200, { data: { id: 'exp-1', status: 'reimbursed' } });
          return;
        }

        // ── Journey 8: Benefits Enrollment & Approval ───────────────────────
        if (pathname === '/api/v1/benefits/plans' && method === 'GET') {
          sendJson(200, {
            data: [
              {
                id: 'plan-1',
                name: 'Bảo hiểm Sức khỏe Toàn diện PVI',
                code: 'PVI-CARE',
                status: 'published',
              },
            ],
          });
          return;
        }
        if (pathname === '/api/v1/benefits/enrollments' && method === 'GET') {
          sendJson(200, {
            data: state.benefitEnrollments,
            meta: { page: 1, limit: 20, total: state.benefitEnrollments.length },
          });
          return;
        }
        if (pathname === '/api/v1/benefits/enrollments' && method === 'POST') {
          const created = {
            id: 'ben-enr-2',
            employeeId: String(parsedBody?.employeeId ?? 'emp-self-1'),
            employeeName: 'Lê Hoàng Phúc Lợi (EMP-SELF)',
            planId: String(parsedBody?.planId ?? 'plan-1'),
            planName: 'Bảo hiểm Sức khỏe Toàn diện PVI',
            status: 'pending',
            coverageType: String(parsedBody?.coverageType ?? 'family'),
            effectiveFrom: '2026-11-01',
            enrolledAt: '2026-10-16T08:00:00.000Z',
          };
          state.benefitEnrollments.push(created);
          sendJson(201, { data: created });
          return;
        }
        if (pathname === '/api/v1/benefits/enrollments/ben-enr-1/approve' && method === 'POST') {
          state.benefitEnrollments = state.benefitEnrollments.map((item) =>
            item.id === 'ben-enr-1' ? { ...item, status: 'approved' } : item,
          );
          sendJson(200, { data: { id: 'ben-enr-1', status: 'approved' } });
          return;
        }

        // ── Journey 9: Payroll Provisional Display & Blocked Release ────────
        if (pathname === '/api/v1/payroll/runs/run-provisional-1' && method === 'GET') {
          sendJson(200, {
            data: {
              id: 'run-provisional-1',
              payrollPeriodId: 'period-2026-10',
              branchId: null,
              status: 'generated',
              approvedByUserId: null,
              approvedAt: null,
              processedAt: '2026-10-16T08:00:00.000Z',
              // Deliberately null notes to verify UI relies on typed calculationStatus/isProvisional
              notes: null,
              isProvisional: true,
              calculationStatus: 'PROVISIONAL_POLICY_UNCONFIRMED',
              createdAt: '2026-10-16T07:30:00.000Z',
              updatedAt: '2026-10-16T08:00:00.000Z',
              payrollPeriod: {
                id: 'period-2026-10',
                code: 'PR-2026-10',
                name: 'Kỳ lương Tháng 10/2026',
                startDate: '2026-10-01',
                endDate: '2026-10-31',
                payDate: '2026-11-05',
                status: 'open',
              },
            },
          });
          return;
        }
        if (pathname === '/api/v1/payroll/runs/run-provisional-approved' && method === 'GET') {
          sendJson(200, {
            data: {
              id: 'run-provisional-approved',
              payrollPeriodId: 'period-2026-10',
              branchId: null,
              status: 'approved',
              approvedByUserId: 'user-hr-1',
              approvedAt: '2026-10-16T08:15:00.000Z',
              processedAt: '2026-10-16T08:00:00.000Z',
              notes: null,
              isProvisional: true,
              calculationStatus: 'PROVISIONAL_POLICY_UNCONFIRMED',
              createdAt: '2026-10-16T07:30:00.000Z',
              updatedAt: '2026-10-16T08:15:00.000Z',
              payrollPeriod: {
                id: 'period-2026-10',
                code: 'PR-2026-10',
                name: 'Kỳ lương Tháng 10/2026',
                startDate: '2026-10-01',
                endDate: '2026-10-31',
                payDate: '2026-11-05',
                status: 'open',
              },
            },
          });
          return;
        }
        if (pathname === '/api/v1/payroll/payslips' && method === 'GET') {
          sendJson(200, {
            data: [
              {
                id: 'ps-prov-1',
                payrollRunId: 'run-provisional-1',
                employeeId: 'emp-self-1',
                grossPay: '25000000',
                totalDeductions: '2500000',
                netPay: '22500000',
                currency: 'VND',
                status: 'draft',
                isProvisional: true,
                calculationStatus: 'PROVISIONAL_POLICY_UNCONFIRMED',
                publishedAt: null,
                metadata: {
                  isProvisional: true,
                  calculationStatus: 'PROVISIONAL_POLICY_UNCONFIRMED',
                },
                createdAt: '2026-10-16T08:00:00.000Z',
                updatedAt: '2026-10-16T08:00:00.000Z',
                employee: {
                  id: 'emp-self-1',
                  employeeCode: 'EMP-SELF',
                  firstName: 'Phúc Lợi',
                  lastName: 'Lê Hoàng',
                },
              },
            ],
            meta: { page: 1, limit: 20, total: 1 },
          });
          return;
        }

        // ── Journey 10: Employees Contracts & Documents Views ───────────────
        if (pathname === '/api/v1/contracts' && method === 'GET') {
          sendJson(200, {
            data: [
              {
                id: 'contract-1',
                employeeId: 'emp-transfer-1',
                employeeName: 'Trần Văn Luân Chuyển',
                employeeCode: 'EMP-TR-01',
                departmentName: state.transferDeptName,
                contractNumber: 'HDLD-2026-001',
                contractType: 'definite',
                status: 'active',
                version: 1,
                isCurrent: true,
                effectiveFrom: '2026-01-01',
                effectiveTo: '2026-12-31',
                signedAt: '2025-12-28',
                createdAt: '2026-01-01T08:00:00.000Z',
              },
            ],
            meta: { pagination: { page: 1, limit: 10, total: 1 } },
          });
          return;
        }
        if (pathname === '/api/v1/employees/emp-transfer-1/contracts' && method === 'GET') {
          sendJson(200, {
            data: [
              {
                id: 'contract-1',
                employeeId: 'emp-transfer-1',
                contractNumber: 'HDLD-2026-001',
                contractType: 'definite',
                status: 'active',
                version: 1,
                isCurrent: true,
                effectiveFrom: '2026-01-01',
                effectiveTo: '2026-12-31',
                signedAt: '2025-12-28',
              },
            ],
          });
          return;
        }
        if (pathname === '/api/v1/documents' && method === 'GET') {
          const isActiveFilter = urlObj.searchParams.get('isActive');
          const allDocs = [
            {
              id: 'doc-active-1',
              employeeId: 'emp-transfer-1',
              employeeName: 'Trần Văn Luân Chuyển',
              employeeCode: 'EMP-TR-01',
              departmentName: state.transferDeptName,
              documentType: 'CCCD',
              fileId: 'file-cccd-1',
              isActive: true,
              createdAt: '2026-01-02T08:00:00.000Z',
            },
            {
              id: 'doc-inactive-1',
              employeeId: 'emp-transfer-1',
              employeeName: 'Trần Văn Luân Chuyển',
              employeeCode: 'EMP-TR-01',
              departmentName: state.transferDeptName,
              documentType: 'PASSPORT_OLD',
              fileId: 'file-pass-old',
              isActive: false,
              createdAt: '2025-05-10T08:00:00.000Z',
            },
          ];
          const filtered =
            isActiveFilter === 'false'
              ? allDocs.filter((d) => !d.isActive)
              : isActiveFilter === 'true'
                ? allDocs.filter((d) => d.isActive)
                : allDocs;
          sendJson(200, {
            data: filtered,
            meta: { pagination: { page: 1, limit: 10, total: filtered.length } },
          });
          return;
        }

        // ── Journey 11: Attendance Self-Service & Period Lifecycle ──────────
        if (pathname === '/api/v1/attendances/today' && method === 'GET') {
          sendJson(200, {
            data: {
              date: '2026-10-17',
              todaySessions: [],
              shift: {
                id: 'shift-1',
                name: 'Ca Hành Chính (08:00 - 17:30)',
                startTime: '08:00',
                endTime: '17:30',
              },
              geofence: null,
              canCheckIn: true,
              canCheckOut: false,
              warnings: [],
            },
          });
          return;
        }
        if (pathname === '/api/v1/attendances/me' && method === 'GET') {
          sendJson(200, {
            data: [],
            pagination: { page: 1, limit: 500, total: 0 },
          });
          return;
        }
        if (
          pathname.startsWith('/api/v1/timekeeping/period-locks/') &&
          pathname.endsWith('/history') &&
          method === 'GET'
        ) {
          sendJson(200, { data: state.attendancePeriodHistory });
          return;
        }
        if (pathname === '/api/v1/timekeeping/period-locks/review' && method === 'POST') {
          const period = String(parsedBody?.period ?? '2026-10');
          const prev = state.attendancePeriodStatus;
          state.attendancePeriodStatus = 'in_review';
          state.attendancePeriodHistory.unshift({
            id: `hist-${state.attendancePeriodHistory.length + 1}`,
            period,
            fromStatus: prev,
            toStatus: 'in_review',
            changedByUserId: 'user-hr-1',
            reason: 'Chuyển rà soát kỳ công',
            createdAt: '2026-10-17T08:00:00.000Z',
          });
          sendJson(200, {
            id: 'lock-2026-10',
            period,
            status: state.attendancePeriodStatus,
          });
          return;
        }
        if (pathname === '/api/v1/timekeeping/period-locks/approve' && method === 'POST') {
          const period = String(parsedBody?.period ?? '2026-10');
          const prev = state.attendancePeriodStatus;
          state.attendancePeriodStatus = 'locked';
          state.attendancePeriodHistory.unshift({
            id: `hist-${state.attendancePeriodHistory.length + 1}`,
            period,
            fromStatus: prev,
            toStatus: 'locked',
            changedByUserId: 'user-hr-1',
            reason: 'Phê duyệt & tạo snapshot lương',
            createdAt: '2026-10-17T08:10:00.000Z',
          });
          sendJson(200, {
            id: 'lock-2026-10',
            period,
            status: state.attendancePeriodStatus,
          });
          return;
        }
        if (pathname === '/api/v1/timekeeping/period-locks/close' && method === 'POST') {
          const period = String(parsedBody?.period ?? '2026-10');
          const remarks = String(parsedBody?.remarks ?? 'Chốt kỳ công');
          const prev = state.attendancePeriodStatus;
          state.attendancePeriodStatus = 'closed';
          state.attendancePeriodHistory.unshift({
            id: `hist-${state.attendancePeriodHistory.length + 1}`,
            period,
            fromStatus: prev,
            toStatus: 'closed',
            changedByUserId: 'user-hr-1',
            reason: remarks,
            createdAt: '2026-10-17T08:20:00.000Z',
          });
          sendJson(200, {
            id: 'lock-2026-10',
            period,
            status: state.attendancePeriodStatus,
            remarks,
          });
          return;
        }
        if (pathname.startsWith('/api/v1/timekeeping/period-locks/') && method === 'GET') {
          const period = pathname.split('/').pop() ?? '2026-10';
          sendJson(200, {
            data: {
              id: 'lock-2026-10',
              period,
              status: state.attendancePeriodStatus,
              lockedByUserId: state.attendancePeriodStatus === 'locked' ? 'user-hr-1' : null,
              lockedAt:
                state.attendancePeriodStatus === 'locked' ? '2026-10-17T08:10:00.000Z' : null,
              remarks: null,
            },
          });
          return;
        }
        if (pathname === '/api/v1/timekeeping/timesheets' && method === 'GET') {
          sendJson(200, {
            data: [
              {
                id: 'ts-sum-1',
                employeeId: 'emp-transfer-1',
                employeeName: 'Trần Văn Luân Chuyển',
                employeeCode: 'EMP-TR-01',
                workDate: '2026-10-16',
                date: '2026-10-16',
                status: 'present',
                checkIn: '2026-10-16T01:00:00.000Z',
                checkOut: '2026-10-16T10:30:00.000Z',
                workedMinutes: 480,
                scheduledMinutes: 480,
                lateMinutes: 0,
                earlyLeaveMinutes: 0,
                overtimeMinutes: 60,
              },
            ],
            pagination: { page: 1, limit: 20, total: 1 },
          });
          return;
        }

        // Default fallback
        sendJson(200, { data: [] });
      });
    });

    const mockApiPort = Number(process.env.E2E_API_PORT || 3001);
    await new Promise<void>((resolve, reject) => {
      apiServer.once('error', reject);
      apiServer.listen(mockApiPort, '127.0.0.1', () => resolve());
    });
  });

  test.afterAll(async () => {
    if (apiServer) {
      await new Promise<void>((resolve) => apiServer.close(() => resolve()));
    }
  });

  test.beforeEach(() => {
    resetState();
  });

  test('1. Recruit-to-hire -> offer acceptance and prefilled employee creation', async ({ page }) => {
    await setRoleSession(page, 'hr_manager');
    await page.goto('/recruitment/candidates');

    await expect(page.getByText('Nguyễn Minh Khoa')).toBeVisible();
    await page.getByRole('button', { name: 'Nguyễn Minh Khoa' }).click();

    await expect(page.getByText('25,000,000 VND')).toBeVisible();
    const acceptButton = page.getByRole('button', { name: /Chấp nhận/i });
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) =>
            r.method === 'POST' &&
            r.url === '/api/v1/recruitment/offers/offer-1/decision' &&
            r.body?.decision === 'accept',
        ),
      )
      .toBe(true);

    const createProfileLink = page.getByRole('link', { name: 'Tạo hồ sơ nhân viên' });
    await expect(createProfileLink).toBeVisible();
    await expect(createProfileLink).toHaveAttribute(
      'href',
      /\/employees\/new\?fromOfferId=offer-1/,
    );

    await createProfileLink.click();
    await expect(page).toHaveURL(/\/employees\/new\?fromOfferId=offer-1/, { timeout: 15000 });
    await expect(
      page.getByText(/Đang khởi tạo hồ sơ nhân viên từ Thư mời nhận việc đã chấp thuận/i),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue(
      'khoa.nguyen@example.com',
    );
  });

  test('2. Onboarding task completion and permission boundary', async ({ page }) => {
    // Self employee without employee:edit cannot see Complete button
    await setRoleSession(page, 'self_employee');
    await page.goto('/onboarding?id=onb-proc-1');

    await expect(page.getByText('Ký hợp đồng thử việc & NDA')).toBeVisible();
    await expect(page.getByText('1/2 mục đã hoàn thành')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hoàn thành' })).toHaveCount(0);

    // Department manager with employee:edit can complete onboarding checklist item
    await setRoleSession(page, 'dept_manager');
    await page.goto('/onboarding?id=onb-proc-1');

    const completeBtn = page.getByRole('button', { name: 'Hoàn thành' });
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) =>
            r.method === 'POST' &&
            r.url === '/api/v1/onboarding/processes/onb-proc-1/items/item-2/complete',
        ),
      )
      .toBe(true);

    await expect(page.getByText('2/2 mục đã hoàn thành')).toBeVisible();
  });

  test('3. Manager and HR transfer approval stage isolation', async ({ page }) => {
    // Stage 1: Department manager approves manager_approval stage, cannot cancel or HR-approve
    await setRoleSession(page, 'dept_manager');
    await page.goto('/employees/emp-transfer-1');

    await expect(page.getByText('Yêu cầu điều chuyển công tác đang xử lý')).toBeVisible();
    const mgrApproveBtn = page.getByRole('button', { name: 'Quản lý duyệt' });
    await expect(mgrApproveBtn).toBeVisible();
    await expect(page.getByRole('button', { name: 'Huỷ yêu cầu' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'HR duyệt & Áp dụng' })).toHaveCount(0);

    await mgrApproveBtn.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) =>
            r.method === 'POST' &&
            r.url === '/api/v1/employees/emp-transfer-1/transfers/wf-transfer-1/manager-approve',
        ),
      )
      .toBe(true);

    // Post-action UI refreshes to hr_approval; manager still cannot see HR approval button
    await expect(page.getByText(/Chờ Nhân sự phê duyệt/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'HR duyệt & Áp dụng' })).toHaveCount(0);

    // Stage 2: HR manager sees HR duyệt & Áp dụng and completes transfer
    await setRoleSession(page, 'hr_manager');
    await page.goto('/employees/emp-transfer-1');

    const hrApproveBtn = page.getByRole('button', { name: 'HR duyệt & Áp dụng' });
    await expect(hrApproveBtn).toBeVisible();
    await expect(page.getByRole('button', { name: 'Huỷ yêu cầu' })).toBeVisible();

    await hrApproveBtn.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) =>
            r.method === 'POST' &&
            r.url === '/api/v1/employees/emp-transfer-1/transfers/wf-transfer-1/hr-approve',
        ),
      )
      .toBe(true);

    await expect(page.getByText('Yêu cầu điều chuyển công tác đang xử lý')).toHaveCount(0);
    await expect(page.getByText(/Phòng Sản phẩm \(Product\)/).first()).toBeVisible();
  });

  test('4. Termination and offboarding completion', async ({ page }) => {
    await setRoleSession(page, 'dept_manager');
    await page.goto('/employees/emp-term-1');

    const terminateTrigger = page.getByRole('button', { name: 'Chấm dứt hợp đồng' });
    await expect(terminateTrigger).toBeVisible();
    await terminateTrigger.click();

    // Dept manager (employee:edit without employee:manage) cannot select Scheduled Termination
    const scheduledModeBtn = page.getByRole('button', { name: /Hẹn ngày chấm dứt/i });
    await expect(scheduledModeBtn).toBeDisabled();

    await page.locator('#terminate-reason').fill('Hoàn tất bàn giao công việc theo nguyện vọng');
    const confirmBtn = page.getByRole('button', { name: /Xác nhận chấm dứt/i });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) => r.method === 'PUT' && r.url === '/api/v1/employees/emp-term-1/terminate',
        ),
      )
      .toBe(true);

    await expect(page.getByText('TERMINATED')).toBeVisible();
    await expect(page.getByRole('link', { name: /Offboarding:/i })).toBeVisible();

    // Navigate to Offboarding process detail and complete offboarding
    await setRoleSession(page, 'hr_manager');
    await page.goto('/offboarding?id=off-proc-1');

    const completeOffboardingBtn = page
      .getByRole('button', { name: 'Hoàn tất quy trình' })
      .first();
    await expect(completeOffboardingBtn).toBeVisible();
    await completeOffboardingBtn.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) =>
            r.method === 'POST' &&
            (r.url === '/api/v1/offboarding/off-proc-1/complete' ||
              r.url === '/api/v1/offboarding/processes/off-proc-1/complete'),
        ),
      )
      .toBe(true);

    await expect(page.getByText('Đã hoàn tất quy trình')).toBeVisible();
  });

  test('5. Archive, restore, and rehire lifecycle isolation', async ({ page }) => {
    // 5a. Archived employees tab: working archived employee can be restored, terminated archived employee cannot
    await setRoleSession(page, 'hr_manager');
    await page.goto('/employees?status=deleted');

    const table = page.getByRole('table');
    await expect(table.getByText('EMP-ARC-01')).toBeVisible();
    await expect(table.getByText('EMP-ARC-02')).toBeVisible();

    // Check terminated archived employee row menu: Restore ('Khôi phục hồ sơ') must be absent
    const terminatedRow = table.locator('tr', { hasText: 'EMP-ARC-02' });
    await terminatedRow.getByRole('button').last().click();
    await expect(page.getByRole('menuitem', { name: /Tái tuyển dụng/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Khôi phục hồ sơ/i })).toHaveCount(0);
    await page.keyboard.press('Escape');

    // Check working archived employee row menu: Restore ('Khôi phục hồ sơ') is available and works
    const workingArchivedRow = table.locator('tr', { hasText: 'EMP-ARC-01' });
    await workingArchivedRow.getByRole('button').last().click();
    const restoreItem = page.getByRole('menuitem', { name: /Khôi phục hồ sơ/i });
    await expect(restoreItem).toBeVisible();
    await restoreItem.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) => r.method === 'POST' && r.url === '/api/v1/employees/emp-archived-1/restore',
        ),
      )
      .toBe(true);

    // 5b. Rehire: Dept manager cannot see Rehire button on terminated employee detail; HR manager can rehire
    await setRoleSession(page, 'dept_manager');
    await page.goto('/employees/emp-terminated-1');
    await expect(page.getByText('TERMINATED')).toBeVisible();
    await expect(page.getByRole('button', { name: /Tái tuyển dụng/i })).toHaveCount(0);

    await setRoleSession(page, 'hr_manager');
    await page.goto('/employees/emp-terminated-1');
    const rehireBtn = page.getByRole('button', { name: /Tái tuyển dụng/i });
    await expect(rehireBtn).toBeVisible();
    await rehireBtn.click();

    const confirmRehireBtn = page.getByRole('button', { name: 'Xác nhận tái tuyển dụng' });
    await expect(confirmRehireBtn).toBeVisible();
    await confirmRehireBtn.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) => r.method === 'POST' && r.url === '/api/v1/employees/emp-terminated-1/rehire',
        ),
      )
      .toBe(true);

    await expect(page.getByText('WORKING', { exact: true })).toBeVisible();
  });

  test('6. Leave approval and self-approval prevention', async ({ page }) => {
    await setRoleSession(page, 'dept_manager');
    await page.goto('/leave/requests');

    await expect(page.getByText(/Hộp thư phê duyệt: Cần bạn xử lý/i)).toBeVisible();
    await expect(page.getByText('Trưởng Phòng Kỹ Thuật (Bản thân)')).toBeVisible();
    await expect(page.getByText('Phạm Văn Nghỉ Phép').first()).toBeVisible();

    // Attempt self-approval -> blocked with 403 SELF_APPROVAL_FORBIDDEN
    const selfCard = page
      .locator('div.rounded-lg.border', { hasText: 'Trưởng Phòng Kỹ Thuật (Bản thân)' })
      .first();
    await selfCard.getByRole('button', { name: 'Duyệt', exact: true }).click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) => r.method === 'POST' && r.url === '/api/v1/approval/inbox/req-self-1/approve',
        ),
      )
      .toBe(true);
    // Self card remains in inbox because self-approval was rejected
    await expect(page.getByText('Trưởng Phòng Kỹ Thuật (Bản thân)')).toBeVisible();

    // Subordinate approval -> succeeds and removes item from pending inbox
    const subCard = page
      .locator('div.rounded-lg.border', { hasText: 'Phạm Văn Nghỉ Phép' })
      .first();
    await subCard.getByRole('button', { name: 'Duyệt', exact: true }).click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) => r.method === 'POST' && r.url === '/api/v1/approval/inbox/req-sub-1/approve',
        ),
      )
      .toBe(true);

    await expect(page.getByText('Hộp thư phê duyệt: Cần bạn xử lý (1 đơn chờ duyệt)')).toBeVisible();
  });

  test('7. Expense submission, approval, and reimbursement', async ({ page }) => {
    // Self employee submits draft claim and cannot self-approve
    await setRoleSession(page, 'self_employee');
    await page.goto('/expenses');

    await expect(page.getByText('Chi phí công tác Đà Nẵng')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(0);

    const submitBtn = page.getByRole('button', { name: /Gửi duyệt/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) => r.method === 'POST' && r.url === '/api/v1/expenses/claims/exp-1/submit',
        ),
      )
      .toBe(true);

    // Even after submission, self-employee cannot see Approve or Reimburse controls
    await expect(page.getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Hoàn ứng/i })).toHaveCount(0);

    // HR manager approves and reimburses the claim
    await setRoleSession(page, 'hr_manager');
    await page.goto('/expenses');

    const approveBtn = page.getByRole('button', { name: 'Duyệt', exact: true });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) => r.method === 'POST' && r.url === '/api/v1/expenses/claims/exp-1/approve',
        ),
      )
      .toBe(true);

    const reimburseBtn = page.getByRole('button', { name: /Hoàn ứng/i });
    await expect(reimburseBtn).toBeVisible();
    await reimburseBtn.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) => r.method === 'POST' && r.url === '/api/v1/expenses/claims/exp-1/reimburse',
        ),
      )
      .toBe(true);

    await expect(page.getByText('Đã hoàn ứng', { exact: true })).toBeVisible();
  });

  test('8. Benefits enrollment and HR approval boundary', async ({ page }) => {
    // Self employee cannot see Approve/Cancel buttons on pending enrollment
    await setRoleSession(page, 'self_employee');
    await page.goto('/benefits/enrollments');

    await expect(page.getByText('Bảo hiểm Sức khỏe Toàn diện PVI')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hủy', exact: true })).toHaveCount(0);

    // HR manager approves pending enrollment
    await setRoleSession(page, 'hr_manager');
    await page.goto('/benefits/enrollments');

    const approveBtn = page.getByRole('button', { name: 'Duyệt', exact: true });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) => r.method === 'POST' && r.url === '/api/v1/benefits/enrollments/ben-enr-1/approve',
        ),
      )
      .toBe(true);

    await expect(page.getByText('Đã duyệt', { exact: true })).toBeVisible();
  });

  test('9. Payroll provisional display and fail-closed blocked release controls', async ({ page }) => {
    await setRoleSession(page, 'hr_manager');

    // 9a. Generated provisional payroll run (with notes: null) shows provisional banner & disables Approve
    await page.goto('/payroll/runs/run-provisional-1');

    await expect(page.getByText(/Tạm tính \(PD-04/i).first()).toBeVisible();
    await expect(page.getByText(/Chế độ tính lương tạm tính/i).first()).toBeVisible();

    const approveRunBtn = page.getByRole('button', { name: /Phê duyệt bảng lương/i });
    await expect(approveRunBtn).toBeVisible();
    await expect(approveRunBtn).toBeDisabled();

    // 9b. Approved provisional payroll run disables Post/Finalize button
    await page.goto('/payroll/runs/run-provisional-approved');

    await expect(page.getByText(/Tạm tính \(PD-04/i).first()).toBeVisible();
    const postRunBtn = page.getByRole('button', { name: /Chốt & Xuất lương \(Post\)/i });
    await expect(postRunBtn).toBeVisible();
    await expect(postRunBtn).toBeDisabled();

    // 9c. Provisional payslip row shows Tạm tính (PD-04) badge and disables Publish button
    await page.goto('/payroll/payslips');

    await expect(page.getByText(/Tạm tính \(PD-04/i).first()).toBeVisible();
    const payslipRow = page.locator('tr', { hasText: 'EMP-SELF' });
    const publishPayslipBtn = payslipRow.getByRole('button', { name: /Công bố phiếu lương/i });
    await expect(publishPayslipBtn).toBeVisible();
    await expect(publishPayslipBtn).toBeDisabled();
  });

  test('10. Employees contracts & documents views, inactive filter, detail sheets, and direct ?mode=edit entry', async ({
    page,
  }) => {
    await setRoleSession(page, 'hr_manager');

    // 10a. /employees/contracts renders without Radix SelectItem empty-value crash and opens detail sheet via action button
    await page.goto('/employees/contracts');
    await expect(page.getByText('HDLD-2026-001')).toBeVisible();
    await expect(page.getByText('Trần Văn Luân Chuyển').first()).toBeVisible();

    const viewDetailBtn = page.getByRole('button', { name: /Xem chi tiết/i }).first();
    await expect(viewDetailBtn).toBeVisible();
    await viewDetailBtn.click();
    await expect(page.getByText('Lịch sử hợp đồng')).toBeVisible();

    // 10b. /employees/documents renders, opens detail sheet on row click, and sends isActive=false when filtering inactive
    await page.goto('/employees/documents');
    await expect(page.getByText('CCCD')).toBeVisible();
    await expect(page.getByText('PASSPORT_OLD')).toBeVisible();

    await page.locator('tr', { hasText: 'CCCD' }).click();
    await expect(page.getByText('Chi tiết hồ sơ')).toBeVisible();
    await page.keyboard.press('Escape');

    // Filter by "Không hoạt động" (isActive=false)
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Không hoạt động' }).click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) => r.method === 'GET' && r.url.includes('/api/v1/documents') && r.url.includes('isActive=false'),
        ),
      )
      .toBe(true);
    await expect(page.getByRole('cell', { name: 'PASSPORT_OLD' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CCCD' })).toHaveCount(0);

    // 10c. Navigating to /employees/:id?mode=edit opens directly in edit mode
    await page.goto('/employees/emp-transfer-1?mode=edit');
    await expect(page.getByText('Đang chỉnh sửa')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lưu', exact: true })).toBeVisible();
  });

  test('11. Attendance role-scoped navigation, self-service landing, and HR period lifecycle (open -> in_review -> locked -> closed)', async ({
    page,
  }) => {
    // 11a. Self-service employee landing on /attendance renders personal check-in screen and hides HR tabs
    await setRoleSession(page, 'self_employee');
    await page.goto('/attendance');

    await expect(page.getByRole('link', { name: 'Chấm công cá nhân' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Quản lý bảng công' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Tổng hợp & Đối soát kỳ công' })).toHaveCount(0);
    await expect(page.getByText(/Ca Hành Chính/i).first()).toBeVisible();

    // 11b. HR Manager drives full Attendance Period Lifecycle on /attendance/summary
    await setRoleSession(page, 'hr_manager');
    await page.goto('/attendance/summary');

    await expect(page.getByText(/Quy trình kỳ công: Tháng/i)).toBeVisible();
    await expect(page.getByText('Đang mở kỳ công')).toBeVisible();

    // Verify enriched timesheet summary table (OverviewTab) renders employee & date
    await expect(page.getByText('Trần Văn Luân Chuyển').first()).toBeVisible();

    // Step 1: open -> in_review
    const reviewBtn = page.getByRole('button', { name: /Chuyển xét duyệt \(Review\)/i });
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) => r.method === 'POST' && r.url === '/api/v1/timekeeping/period-locks/review',
        ),
      )
      .toBe(true);
    await expect(page.getByText('Đang xét duyệt')).toBeVisible();

    // Step 2: in_review -> locked (Approve & Lock)
    const approveBtn = page.getByRole('button', { name: /Phê duyệt & Khóa công \(Lock\)/i });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) => r.method === 'POST' && r.url === '/api/v1/timekeeping/period-locks/approve',
        ),
      )
      .toBe(true);
    await expect(page.getByText('Đã khóa bảng công')).toBeVisible();

    // Step 3: locked -> closed (Close period with optional/default remarks)
    const closeBtn = page.getByRole('button', { name: /Chốt kỳ công \(Close\)/i });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    await expect(page.getByText('Xác nhận chốt kỳ công')).toBeVisible();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();

    await expect
      .poll(() =>
        recordedRequests.some(
          (r) => r.method === 'POST' && r.url === '/api/v1/timekeeping/period-locks/close',
        ),
      )
      .toBe(true);
    await expect(page.getByText('Đã chốt kỳ')).toBeVisible();

    // Step 4: Verify Period Transition History dialog displays normalized backend history records
    await page.getByRole('button', { name: /Lịch sử kỳ/i }).click();
    await expect(page.getByText(/Lịch sử chuyển đổi kỳ công/i)).toBeVisible();
    await expect(page.getByText('Chốt kỳ công').first()).toBeVisible();
  });
});
