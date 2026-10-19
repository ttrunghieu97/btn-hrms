import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserFormSheet } from './user-form-sheet';
import { UserRolesSheet } from './user-roles-sheet';
import { CellAction } from './users-table/cell-action';
import type { User } from '../api/types';
import {
  employeesControllerCreate,
  employeesControllerUpdate
} from '@/api/generated/employees-hr-management/employees-hr-management';
import { employeeAdminControllerRemove } from '@/api/generated/employee-admin/employee-admin';
import { accessControlControllerUpdateAccessControl } from '@/api/generated/access-control/access-control';

jest.mock('@/api/generated/employees-hr-management/employees-hr-management', () => ({
  employeesControllerCreate: jest.fn(),
  employeesControllerUpdate: jest.fn()
}));

jest.mock('@/api/generated/employee-admin/employee-admin', () => ({
  employeeAdminControllerRemove: jest.fn()
}));

jest.mock('@/api/generated/access-control/access-control', () => ({
  accessControlControllerUpdateAccessControl: jest.fn()
}));

jest.mock('@/features/roles', () => ({
  rolesQueryOptions: {
    queryKey: ['roles'],
    queryFn: async () => [
      {
        id: 'role-hr',
        name: 'HR Manager',
        description: 'Quản lý nhân sự',
        permissions: ['employees:view:all']
      }
    ]
  }
}));

jest.mock('@/features/permissions', () => ({
  usePermissionsQuery: () => ({
    data: {
      permissions: [
        {
          id: 'perm-1',
          code: 'users:view',
          name: 'Xem người dùng',
          module: 'Users'
        }
      ],
      groupedPermissions: {
        Users: [
          {
            id: 'perm-1',
            code: 'users:view',
            name: 'Xem người dùng',
            module: 'Users'
          }
        ]
      }
    },
    isLoading: false
  })
}));

jest.mock('@/features/profile', () => ({
  useMyUserProfileQuery: () => ({
    data: {
      id: 'admin-1',
      username: 'sysadmin',
      isSuperAdmin: true
    }
  })
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

const sampleUser: User = {
  id: 'user-101',
  username: 'nguyen.van.a',
  email: 'nguyenvana@bachthaongan.vn',
  employeeId: 'emp-101',
  employeeUsername: 'NV00101',
  isSuperAdmin: false,
  roleIds: ['role-hr'],
  permissions: ['users:view']
};

describe('User identity read-only & supported user actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders username and email as strictly read-only/disabled in edit mode and prevents any update mutation', () => {
    const onOpenChange = jest.fn();

    renderWithQueryClient(
      <UserFormSheet user={sampleUser} open={true} onOpenChange={onOpenChange} />
    );

    const usernameInput = screen.getByLabelText(/Tên đăng nhập/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
    const linkedEmployeeInput = screen.getByLabelText(/Hồ sơ nhân sự liên kết/i) as HTMLInputElement;

    expect(usernameInput).toHaveValue('nguyen.van.a');
    expect(usernameInput).toHaveAttribute('readonly');
    expect(usernameInput).toBeDisabled();
    expect(usernameInput).toHaveAttribute('aria-readonly', 'true');

    expect(emailInput).toHaveValue('nguyenvana@bachthaongan.vn');
    expect(emailInput).toHaveAttribute('readonly');
    expect(emailInput).toBeDisabled();
    expect(emailInput).toHaveAttribute('aria-readonly', 'true');

    expect(linkedEmployeeInput).toHaveValue('NV00101');
    expect(linkedEmployeeInput).toHaveAttribute('readonly');
    expect(linkedEmployeeInput).toBeDisabled();

    // No submit button is rendered in edit mode
    expect(screen.queryByRole('button', { name: /Tạo người dùng/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lưu/i })).not.toBeInTheDocument();

    // Attempting to change input values does not trigger any mutation
    fireEvent.change(usernameInput, { target: { value: 'hacked.username' } });
    fireEvent.change(emailInput, { target: { value: 'hacked@example.com' } });

    expect(employeesControllerUpdate).not.toHaveBeenCalled();
    expect(employeesControllerCreate).not.toHaveBeenCalled();
  });

  it('creates a new user with supported fields only (firstName, lastName, email, phoneNumber)', async () => {
    (employeesControllerCreate as jest.Mock).mockResolvedValue({
      data: { data: { id: 'emp-new', username: 'tran.thi.b' } },
      status: 201,
      headers: new Headers()
    });
    const onOpenChange = jest.fn();

    renderWithQueryClient(
      <UserFormSheet open={true} onOpenChange={onOpenChange} />
    );

    fireEvent.change(screen.getByLabelText(/Tên \*/i), {
      target: { value: 'Bình' }
    });
    fireEvent.change(screen.getByLabelText(/Họ và tên đệm/i), {
      target: { value: 'Trần Thị' }
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'binh.tran@bachthaongan.vn' }
    });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/i), {
      target: { value: '0901234567' }
    });

    const submitButton = screen.getByRole('button', { name: /Tạo người dùng/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(employeesControllerCreate).toHaveBeenCalledTimes(1);
    });

    expect(employeesControllerCreate).toHaveBeenCalledWith({
      firstName: 'Bình',
      lastName: 'Trần Thị',
      email: 'binh.tran@bachthaongan.vn',
      phoneNumber: '0901234567'
    });
    expect(employeesControllerUpdate).not.toHaveBeenCalled();
  });

  it('updates user roles and permissions without sending email or username in the access-control payload', async () => {
    (accessControlControllerUpdateAccessControl as jest.Mock).mockResolvedValue({
      data: { data: { success: true } },
      status: 200,
      headers: new Headers()
    });
    const onOpenChange = jest.fn();

    renderWithQueryClient(
      <UserRolesSheet user={sampleUser} open={true} onOpenChange={onOpenChange} />
    );

    const saveButton = await screen.findByRole('button', { name: /Lưu phân quyền/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(accessControlControllerUpdateAccessControl).toHaveBeenCalledTimes(1);
    });

    expect(accessControlControllerUpdateAccessControl).toHaveBeenCalledWith(
      'user-101',
      {
        roleIds: ['role-hr'],
        permissionCodes: ['users:view'],
        isSuperAdmin: false
      }
    );

    const [, sentPayload] = (accessControlControllerUpdateAccessControl as jest.Mock).mock.calls[0];
    expect(sentPayload).not.toHaveProperty('email');
    expect(sentPayload).not.toHaveProperty('username');
    expect(employeesControllerUpdate).not.toHaveBeenCalled();
  });

  it('preserves user deletion/deactivation flow via employeeAdminControllerRemove', async () => {
    (employeeAdminControllerRemove as jest.Mock).mockResolvedValue({
      data: { data: { success: true } },
      status: 200,
      headers: new Headers()
    });

    renderWithQueryClient(<CellAction data={sampleUser} />);

    // Open dropdown menu via keyboard Enter (Radix DropdownMenuTrigger)
    const triggerBtn = screen.getByRole('button', { name: /Mở menu/i });
    fireEvent.keyDown(triggerBtn, { key: 'Enter', code: 'Enter' });

    const deleteItem = await screen.findByRole('menuitem', { name: /Xóa/i });
    fireEvent.click(deleteItem);

    // Confirm deletion in AlertModal
    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(employeeAdminControllerRemove).toHaveBeenCalledWith('nguyen.van.a');
    });
  });
});
