import { createWorkflow } from './builder';

export const onboardingWorkflow = createWorkflow({
  id: 'onboarding-process',
  name: 'Quy trình Tiếp nhận & Hội nhập (Onboarding Process)',
  entity: 'OnboardingProcess',
  description: 'Quản lý các công việc tiếp nhận nhân sự mới, bàn giao trang thiết bị, hoàn thiện hồ sơ và đào tạo hội nhập văn hóa.',
  apiBaseUrl: '/api/v1/onboarding/processes',
  initialState: 'pending',
  states: [
    {
      key: 'pending',
      label: '1. Tiếp nhận hồ sơ',
      stepNumber: 1,
      variant: 'outline',
      description: 'Chuẩn bị hồ sơ nhân sự, hợp đồng lao động và tài nguyên làm việc.',
      responsibleActor: {
        role: 'hr_specialist',
        label: 'Chuyên viên Nhân sự & IT Admin',
      },
      actionGuidance: 'Tạo tài khoản email, bàn giao máy tính và chuẩn bị hợp đồng thử việc.',
      resultPreview: 'Chuyển sang giai đoạn Đào tạo & Hội nhập.',
    },
    {
      key: 'in_progress',
      label: '2. Đào tạo & Hội nhập',
      stepNumber: 2,
      variant: 'amber',
      description: 'Nhân viên thực hiện các mục checklist hội nhập và đào tạo nội bộ.',
      responsibleActor: {
        role: 'new_hire_and_mentor',
        label: 'Nhân viên mới & Người hướng dẫn (Mentor)',
      },
      actionGuidance: 'Hoàn thành các nội dung đào tạo nhập môn và các mục checklist bắt buộc.',
      resultPreview: 'Chuyển sang giai đoạn Hoàn tất hội nhập.',
    },
    {
      key: 'completed',
      label: '3. Hoàn tất hội nhập',
      stepNumber: 3,
      variant: 'emerald',
      description: 'Nhân viên đã hoàn thành toàn bộ chương trình hội nhập.',
      responsibleActor: {
        role: 'completed',
        label: 'Đã hoàn tất quy trình',
      },
      actionGuidance: 'Quy trình hội nhập thành công.',
      resultPreview: 'Nhân viên chính thức hòa nhập và bắt đầu công việc thử việc/chính thức.',
      isTerminal: true,
    },
    {
      key: 'terminated',
      label: 'Đã dừng trước hạn',
      stepNumber: 3,
      variant: 'destructive',
      description: 'Quy trình hội nhập bị hủy bỏ trước thời hạn.',
      responsibleActor: {
        role: 'completed',
        label: 'Quy trình đã kết thúc',
      },
      actionGuidance: 'Thủ tục hội nhập dừng lại.',
      resultPreview: 'Đóng quy trình tiếp nhận.',
      isTerminal: true,
      isFailure: true,
    },
  ],
  actions: [
    { id: 'start_onboarding', label: 'Bắt đầu hội nhập', targetState: 'in_progress', actor: 'hr_specialist', variant: 'default' },
    { id: 'complete_onboarding', label: 'Hoàn tất hội nhập', targetState: 'completed', actor: 'hr_specialist', variant: 'default' },
    { id: 'terminate_onboarding', label: 'Dừng quy trình', targetState: 'terminated', actor: 'hr_specialist', variant: 'destructive' },
  ],
  transitions: [
    { from: 'pending', to: 'in_progress', actionId: 'start_onboarding', label: 'Bắt đầu', actor: 'HR' },
    { from: 'in_progress', to: 'completed', actionId: 'complete_onboarding', label: 'Hoàn tất', actor: 'HR' },
    { from: 'pending', to: 'terminated', actionId: 'terminate_onboarding', label: 'Dừng', actor: 'HR' },
    { from: 'in_progress', to: 'terminated', actionId: 'terminate_onboarding', label: 'Dừng', actor: 'HR' },
  ],
});
