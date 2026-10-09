import { createWorkflow } from './builder';

export const scheduleRequestsWorkflow = createWorkflow({
  id: 'schedule-request',
  name: 'Yêu cầu Thay đổi Lịch / Nghỉ ca (Schedule Request)',
  entity: 'ScheduleRequest',
  description: 'Quản lý yêu cầu đổi ca, xin nghỉ ca sáng/chiều/cả ngày của nhân viên, kiểm tra độ phủ nhân sự và phê duyệt của quản lý lịch trình.',
  apiBaseUrl: '/api/v1/schedule-requests',
  initialState: 'pending',
  states: [
    {
      key: 'pending',
      label: '1. Đang chờ duyệt',
      stepNumber: 1,
      variant: 'amber',
      description: 'Yêu cầu xin nghỉ ca hoặc đổi ca đã được nhân viên gửi lên cấp quản lý.',
      responsibleActor: {
        role: 'manager',
        label: 'Quản lý ca / Phụ trách Xếp lịch',
      },
      actionGuidance: 'Kiểm tra độ phủ nhân sự trong ngày và quyết định Chấp thuận hoặc Từ chối yêu cầu đổi ca.',
      resultPreview: 'Nếu chấp thuận, hệ thống sẽ tự động cập nhật phân ca làm việc mới.',
    },
    {
      key: 'approved',
      label: '2. Đã chấp thuận',
      stepNumber: 2,
      variant: 'emerald',
      description: 'Yêu cầu thay đổi ca đã được phê duyệt và áp dụng trực tiếp vào bảng phân ca của nhân viên.',
      responsibleActor: {
        role: 'completed',
        label: 'Đã hoàn tất quy trình',
      },
      actionGuidance: 'Lịch làm việc đã được cập nhật chính thức.',
      resultPreview: 'Bảng phân ca tuần/tháng được làm mới với thay đổi vừa duyệt.',
      isTerminal: true,
    },
    {
      key: 'denied',
      label: 'Bị từ chối',
      stepNumber: 2,
      variant: 'destructive',
      description: 'Yêu cầu thay đổi ca không được phê duyệt (do thiếu nhân sự trực ca hoặc không hợp lệ).',
      responsibleActor: {
        role: 'employee',
        label: 'Nhân viên (Người gửi yêu cầu)',
      },
      actionGuidance: 'Yêu cầu bị từ chối. Nhân viên vẫn làm việc theo lịch phân ca hiện tại.',
      resultPreview: 'Giữ nguyên phân ca ban đầu.',
      isTerminal: true,
      isFailure: true,
    },
  ],
  actions: [
    { id: 'approve', label: 'Chấp thuận yêu cầu', targetState: 'approved', actor: 'manager', variant: 'default' },
    { id: 'deny', label: 'Từ chối yêu cầu', targetState: 'denied', actor: 'manager', variant: 'destructive' },
  ],
  transitions: [
    { from: 'pending', to: 'approved', actionId: 'approve', label: 'Chấp thuận', actor: 'Quản lý ca' },
    { from: 'pending', to: 'denied', actionId: 'deny', label: 'Từ chối', actor: 'Quản lý ca' },
  ],
});
