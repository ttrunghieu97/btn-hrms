import { fireEvent, render, screen } from '@testing-library/react';
import { LeaveApprovalInboxSection } from './leave-approval-inbox-section';

const approveMutate = jest.fn();
const rejectMutate = jest.fn();

jest.mock('@/api/generated/approval-inbox/approval-inbox', () => ({
  useApprovalInboxControllerList: () => ({
    isLoading: false,
    data: {
      data: [
        {
          approvalRequestId: 'approval-req-999',
          leaveRequestId: 'leave-req-111',
          status: 'pending',
          requestedAt: '2026-04-10T08:00:00Z',
          requester: {
            id: 'emp-1',
            fullName: 'Nguyen Van A',
            employeeCode: 'NV001',
            departmentName: 'Engineering',
          },
          leaveType: {
            code: 'AL',
            name: 'Nghỉ phép năm',
            isPaid: true,
          },
          startDate: '2026-04-15',
          endDate: '2026-04-16',
          totalUnits: '2',
          reason: 'Nghỉ việc riêng',
        },
      ],
    },
  }),
}));

jest.mock('../api/mutations', () => ({
  useApproveLeaveInboxRequest: () => ({
    isPending: false,
    mutate: approveMutate,
  }),
  useRejectLeaveInboxRequest: () => ({
    isPending: false,
    mutate: rejectMutate,
  }),
  useCancelLeaveRequest: () => ({
    isPending: false,
    mutate: jest.fn(),
  }),
}));

describe('LeaveApprovalInboxSection', () => {
  beforeEach(() => {
    approveMutate.mockReset();
    rejectMutate.mockReset();
  });

  it('passes approvalRequestId instead of leaveRequestId when approving or rejecting', () => {
    render(<LeaveApprovalInboxSection />);

    fireEvent.click(screen.getByRole('button', { name: /Duyệt/i }));
    expect(approveMutate).toHaveBeenCalledWith({
      id: 'approval-req-999',
      data: { comment: 'Đã duyệt qua hộp thư nhanh' },
    });
  });
});
