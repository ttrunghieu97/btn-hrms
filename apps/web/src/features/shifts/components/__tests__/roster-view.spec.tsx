import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { RosterView } from '../roster-view';
import {
  workforceShiftsControllerListAssignmentsApi,
  workforceShiftsControllerListTemplatesApi,
  workforceShiftsControllerQueryRosterApi
} from '@/api/generated/workforce-schedules/workforce-schedules';
import { employeesControllerFindAll } from '@/api/generated/employees-hr-management/employees-hr-management';
import { departmentsControllerFindAll } from '@/api/generated/department-management/department-management';
import { positionsControllerFindAll } from '@/api/generated/positions/positions';
import { locationsControllerFindList } from '@/api/generated/location-management/location-management';
import { useAuthStore } from '@/stores/auth-store';

jest.mock('nuqs', () => {
  const parser = {
    withDefault: jest.fn().mockReturnThis(),
    withOptions: jest.fn().mockReturnThis()
  };
  return {
    useQueryState: jest.fn(() => [null, jest.fn()]),
    useQueryStates: jest.fn(() => [{}, jest.fn()]),
    parseAsInteger: parser,
    parseAsString: parser,
    parseAsArrayOf: jest.fn(() => parser)
  };
});

jest.mock('nuqs/server', () => {
  const parser = {
    withDefault: jest.fn().mockReturnThis(),
    withOptions: jest.fn().mockReturnThis()
  };
  return {
    parseAsInteger: parser,
    parseAsString: parser,
    createSearchParamsCache: jest.fn(() => ({ parse: jest.fn(), get: jest.fn() })),
    createParser: jest.fn(() => parser)
  };
});

jest.mock('@/api/generated/workforce-schedules/workforce-schedules', () => ({
  workforceShiftsControllerQueryRosterApi: jest.fn(),
  workforceShiftsControllerListAssignmentsApi: jest.fn(),
  workforceShiftsControllerListTemplatesApi: jest.fn(),
  workforceShiftsControllerApproveRosterApi: jest.fn(),
  workforceShiftsControllerPublishRosterApi: jest.fn(),
  workforceShiftsControllerRejectRosterApi: jest.fn(),
  workforceShiftsControllerSubmitRosterApi: jest.fn(),
  workforceShiftsControllerCreateAssignmentApi: jest.fn(),
  workforceShiftsControllerCancelAssignmentApi: jest.fn()
}));

jest.mock('@/api/generated/employees-hr-management/employees-hr-management', () => ({
  employeesControllerFindAll: jest.fn()
}));

jest.mock('@/api/generated/department-management/department-management', () => ({
  departmentsControllerFindAll: jest.fn()
}));

jest.mock('@/api/generated/positions/positions', () => ({
  positionsControllerFindAll: jest.fn()
}));

jest.mock('@/api/generated/location-management/location-management', () => ({
  locationsControllerFindList: jest.fn()
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('RosterView — Phase 3 Query, Permission & Data Resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      loading: false,
      initialized: true,
      refreshPromise: null
    });

    (workforceShiftsControllerListTemplatesApi as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'tpl-1',
          code: 'MORNING',
          name: 'Ca sáng',
          startTime: '08:00',
          endTime: '17:00',
          breakMinutes: 60,
          overnight: false,
          status: 'published',
          isActive: true
        }
      ]
    });

    (workforceShiftsControllerListAssignmentsApi as jest.Mock).mockResolvedValue({
      data: []
    });

    (departmentsControllerFindAll as jest.Mock).mockResolvedValue({
      data: [{ id: 'dept-1', name: 'Phòng Kỹ thuật' }]
    });

    (positionsControllerFindAll as jest.Mock).mockResolvedValue({
      data: [{ id: 'pos-1', name: 'Kỹ sư', isActive: true, employeeCount: 1 }]
    });

    (locationsControllerFindList as jest.Mock).mockResolvedValue({
      data: [{ id: 'loc-1', code: 'ZONE_A', name: 'Khu A' }]
    });
  });

  it('calculates weeklyHours by employeeId even when roster employeeName differs from firstName + lastName, and includes unscheduled catalog employees for managers', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-mgr',
        username: 'manager',
        email: 'manager@company.vn',
        isSuperAdmin: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        permissions: [
          'schedule:view:department',
          'schedule:edit:department',
          'employee:view:department',
          'departments:view'
        ]
      },
      initialized: true
    });

    (employeesControllerFindAll as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'emp-1',
          firstName: 'An',
          lastName: 'Nguyễn Văn',
          employeeCode: 'EMP001',
          department: { id: 'dept-1', name: 'Phòng Kỹ thuật' }
        },
        {
          id: 'emp-2',
          firstName: 'Bình',
          lastName: 'Trần Thị',
          employeeCode: 'EMP002',
          department: { id: 'dept-1', name: 'Phòng Kỹ thuật' }
        }
      ]
    });

    // 6 shifts of 8 hours (480 mins each = 2880 mins = 48h > 40h limit) for emp-1
    // Note that employeeName in roster response is formatted "Nguyễn Văn An" (lastName firstName),
    // which previously broke weeklyHours when keyed by employeeName instead of employeeId.
    (workforceShiftsControllerQueryRosterApi as jest.Mock).mockImplementation(
      async (params: { from: string }) => ({
        data: {
          from: params.from,
          to: params.from,
          publication: {
            isPublished: false,
            status: 'draft',
            version: 1
          },
          rows: [0, 1, 2, 3, 4, 5].map((idx) => ({
            assignmentId: `asg-${idx}`,
            assignmentStatus: 'planned',
            employeeId: 'emp-1',
            employeeName: 'Nguyễn Văn An',
            departmentId: 'dept-1',
            shiftTemplateId: 'tpl-1',
            shiftTemplateCode: 'MORNING',
            shiftTemplateName: 'Ca sáng',
            workDate: params.from,
            startTime: '08:00',
            endTime: '17:00',
            overnight: false,
            breakMinutes: 60,
            scheduledMinutes: 480
          }))
        }
      })
    );

    renderWithQueryClient(<RosterView />);

    await waitFor(() => {
      expect(screen.getByText('An Nguyễn Văn')).toBeInTheDocument();
    });

    // Unscheduled employee from catalog is also displayed so manager can assign shifts
    expect(screen.getByText('Bình Trần Thị')).toBeInTheDocument();

    // Weekly hours summed accurately by employeeId (48h) and overtime warning triggered
    expect(screen.getByText('48h')).toBeInTheDocument();
    expect(screen.getByText('Vượt quá 40h/tuần (48h)')).toBeInTheDocument();
    expect(
      screen.getByText(/Cảnh báo quy định làm việc \(1 vi phạm\)/)
    ).toBeInTheDocument();

    // Positions and locations queries are not fired on initial mount when assignment sheet is closed
    expect(positionsControllerFindAll).not.toHaveBeenCalled();
    expect(locationsControllerFindList).not.toHaveBeenCalled();
  });

  it('skips unauthorized catalog APIs and synthesizes employee rows from roster data for self-view users', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-staff',
        username: 'staff.member',
        email: 'staff@company.vn',
        isSuperAdmin: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        permissions: ['schedule:view:self']
      },
      initialized: true
    });

    (workforceShiftsControllerQueryRosterApi as jest.Mock).mockImplementation(
      async (params: { from: string }) => ({
        data: {
          from: params.from,
          to: params.from,
          publication: {
            isPublished: true,
            status: 'published_locked',
            version: 1
          },
          rows: [
            {
              assignmentId: 'asg-self-1',
              assignmentStatus: 'planned',
              employeeId: 'emp-self',
              employeeName: 'Lê Hoàng Nam',
              departmentId: 'dept-1',
              shiftTemplateId: 'tpl-1',
              shiftTemplateCode: 'MORNING',
              shiftTemplateName: 'Ca sáng',
              workDate: params.from,
              startTime: '08:00',
              endTime: '17:00',
              overnight: false,
              breakMinutes: 60,
              scheduledMinutes: 480
            }
          ]
        }
      })
    );

    renderWithQueryClient(<RosterView />);

    await waitFor(() => {
      expect(screen.getByText('Lê Hoàng Nam')).toBeInTheDocument();
    });

    // Catalog endpoints that require employee/department/location permissions are NOT called
    expect(employeesControllerFindAll).not.toHaveBeenCalled();
    expect(departmentsControllerFindAll).not.toHaveBeenCalled();
    expect(positionsControllerFindAll).not.toHaveBeenCalled();
    expect(locationsControllerFindList).not.toHaveBeenCalled();

    // Management actions (bulk assign, unlock roster) are hidden for read-only users
    expect(
      screen.queryByRole('button', { name: /Phân ca hàng loạt/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Mở khóa ngay/i })
    ).not.toBeInTheDocument();
  });
});
