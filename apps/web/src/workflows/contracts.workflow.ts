import { createWorkflow } from './builder';

export const contractsWorkflow = createWorkflow({
  id: 'contract-lifecycle',
  name: 'Vòng đời Hợp đồng Lao động (Contract Lifecycle)',
  entity: 'EmployeeContract',
  description: 'Quản trị hiệu lực hợp đồng, cảnh báo hết hạn thời hạn, sửa đổi phụ lục (amend tạo V2, V3) và thanh lý hợp đồng.',
  apiBaseUrl: '/api/v1/contracts',
  initialState: 'draft',
  states: [
    {
      key: 'draft',
      label: '1. Soạn thảo hợp đồng',
      stepNumber: 1,
      variant: 'outline',
      description: 'Hợp đồng lao động mới hoặc phụ lục hợp đồng đang được soạn thảo.',
      responsibleActor: {
        role: 'hr_specialist',
        label: 'Chuyên viên Nhân sự & Pháp chế',
      },
      actionGuidance: 'Kiểm tra các điều khoản lương, chức danh, thời hạn và ký kết.',
      resultPreview: 'Hợp đồng chuyển sang trạng thái Đang có hiệu lực (Active).',
    },
    {
      key: 'active',
      label: '2. Đang có hiệu lực',
      stepNumber: 2,
      variant: 'emerald',
      description: 'Hợp đồng đang có hiệu lực pháp lý.',
      responsibleActor: {
        role: 'hr_specialist',
        label: 'Phòng Hành chính Nhân sự',
      },
      actionGuidance: 'Theo dõi thời hạn hiệu lực. Khi có thay đổi mức lương hoặc vị trí, bấm Sửa đổi hợp đồng (Amend) để tạo phiên bản mới.',
      resultPreview: 'Tạo phụ lục hợp đồng phiên bản mới (V2, V3...) và lưu trữ phiên bản cũ.',
    },
    {
      key: 'superseded',
      label: '3. Đã thay thế (Cũ)',
      stepNumber: 3,
      variant: 'secondary',
      description: 'Hợp đồng phiên bản cũ đã được thay thế bởi phụ lục mới.',
      responsibleActor: {
        role: 'completed',
        label: 'Lưu trữ lịch sử phiên bản',
      },
      actionGuidance: 'Hợp đồng phiên bản này đã hết hiệu lực do có phụ lục mới.',
      resultPreview: 'Lưu trữ làm căn cứ đối soát lịch sử.',
      isTerminal: true,
    },
    {
      key: 'terminated',
      label: '4. Đã thanh lý / Kết thúc',
      stepNumber: 4,
      variant: 'destructive',
      description: 'Hợp đồng lao động đã chấm dứt hoặc thanh lý.',
      responsibleActor: {
        role: 'completed',
        label: 'Quy trình đã kết thúc',
      },
      actionGuidance: 'Hợp đồng đã thanh lý.',
      resultPreview: 'Kết thúc quan hệ lao động theo hợp đồng này.',
      isTerminal: true,
    },
  ],
  actions: [
    { id: 'activate_contract', label: 'Kích hoạt hợp đồng', targetState: 'active', actor: 'hr_specialist', variant: 'default' },
    { id: 'amend_contract', label: 'Tạo phụ lục sửa đổi (Amend)', targetState: 'active', actor: 'hr_specialist', variant: 'default' },
    { id: 'terminate_contract', label: 'Thanh lý hợp đồng', targetState: 'terminated', actor: 'hr_specialist', variant: 'destructive' },
  ],
  transitions: [
    { from: 'draft', to: 'active', actionId: 'activate_contract', label: 'Ký kết', actor: 'HR' },
    { from: 'active', to: 'superseded', actionId: 'amend_contract', label: 'Thay thế bởi bản mới', actor: 'HR' },
    { from: 'active', to: 'terminated', actionId: 'terminate_contract', label: 'Thanh lý', actor: 'HR' },
  ],
});
