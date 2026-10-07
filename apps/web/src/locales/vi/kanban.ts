type KanbanPriority = 'low' | 'medium' | 'high';

type KanbanSeedTask = {
  id: string;
  title: string;
  priority: KanbanPriority;
  description?: string;
  assignee?: string;
  dueDate?: string;
};

export const kanbanUiCopy = {
  pageTitle: 'Bảng công việc',
  pageDescription: 'Quản lý công việc bằng thao tác kéo thả.',
  columns: {
    backlog: 'Chờ xử lý',
    inProgress: 'Đang thực hiện',
    review: 'Chờ duyệt',
    done: 'Hoàn thành'
  },
  priorities: {
    low: 'Thấp',
    medium: 'Trung bình',
    high: 'Cao'
  },
  dialog: {
    trigger: 'Thêm công việc',
    title: 'Công việc mới',
    description: 'Nhập thông tin công việc cần theo dõi trong hôm nay.',
    titlePlaceholder: 'Nhập tiêu đề công việc...',
    descriptionPlaceholder: 'Mô tả ngắn...',
    submit: 'Tạo công việc'
  },
  diagnostics: {
    panelTitle: 'Chẩn đoán bảng công việc',
    healthy: '✓ ổn định',
    issues: 'vấn đề',
    tasksSummary: (totalTasks: number, statesCount: number) => `${totalTasks} công việc trong ${statesCount} trạng thái`,
    issuesHeader: 'Vấn đề phát hiện',
    taskLabel: 'công việc'
  }
} as const;

export const kanbanSeedColumns: Record<string, KanbanSeedTask[]> = {
  backlog: [
    {
      id: '1',
      title: 'Tích hợp API thanh toán Stripe',
      priority: 'high',
      assignee: 'Sarah Chen',
      dueDate: '2026-04-08'
    },
    {
      id: '2',
      title: 'Bổ sung xuất CSV cho báo cáo',
      priority: 'medium',
      assignee: 'Marcus Rivera',
      dueDate: '2026-04-12'
    },
    {
      id: '3',
      title: 'Cập nhật nội dung onboarding',
      priority: 'low',
      assignee: 'Priya Sharma',
      dueDate: '2026-04-15'
    },
    {
      id: '9',
      title: 'Rà soát quyền RBAC',
      priority: 'medium',
      assignee: 'Jordan Kim',
      dueDate: '2026-04-10'
    }
  ],
  inProgress: [
    {
      id: '4',
      title: 'Tái cấu trúc dịch vụ thông báo',
      priority: 'high',
      assignee: 'Alex Turner',
      dueDate: '2026-04-03'
    },
    {
      id: '5',
      title: 'Xây dựng luồng mới thành viên',
      priority: 'medium',
      assignee: 'Emily Nakamura',
      dueDate: '2026-04-06'
    },
    {
      id: '10',
      title: 'Sửa xử lý múi giờ trong lịch làm việc',
      priority: 'high',
      assignee: 'Sarah Chen',
      dueDate: '2026-04-04'
    }
  ],
  done: [
    {
      id: '6',
      title: 'Tích hợp SSO với Okta',
      priority: 'high',
      assignee: 'Jordan Kim',
      dueDate: '2026-03-22'
    },
    {
      id: '7',
      title: 'Hoàn tất biểu đồ analytics dashboard',
      priority: 'medium',
      assignee: 'Marcus Rivera',
      dueDate: '2026-03-20'
    },
    {
      id: '8',
      title: 'Bổ sung cơ chế retry cho webhook',
      priority: 'low',
      assignee: 'Alex Turner',
      dueDate: '2026-03-18'
    }
  ]
};
