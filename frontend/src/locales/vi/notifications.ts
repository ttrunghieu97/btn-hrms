export const notificationUiCopy = {
  centerLabel: 'Thông báo',
  newCount: (count: number) => `${count} mới`,
  markAllAsRead: 'Đánh dấu đã đọc tất cả',
  noNotificationsYet: 'Chưa có thông báo nào',
  emptyList: 'Không có thông báo',
  pageTitle: 'Thông báo',
  pageDescription: 'Xem và quản lý toàn bộ thông báo của bạn.',
  tabs: {
    all: (count: number) => `Tất cả (${count})`,
    unread: (count: number) => `Chưa đọc (${count})`,
    read: (count: number) => `Đã đọc (${count})`
  }
} as const;

export const notificationActionRoutes: Record<string, string> = {
  view: '/company',
  'view-product': '/product',
  billing: '/billing',
  open: '/kanban',
  'open-chat': '/chat'
};

export const notificationSeed = [
  {
    id: '1',
    title: 'Có thành viên mới vào phòng ban',
    body: 'Sarah Connor đã tham gia phòng Engineering.',
    status: 'unread',
    createdAtOffsetMs: 1000 * 60 * 5,
    actions: [
      {
        id: 'view',
        label: 'Xem công ty',
        type: 'redirect',
        style: 'primary'
      }
    ]
  },
  {
    id: '2',
    title: 'Sản phẩm mới được tạo',
    body: 'Sản phẩm "Dashboard Pro" đã được thêm vào danh mục.',
    status: 'unread',
    createdAtOffsetMs: 1000 * 60 * 30,
    actions: [
      {
        id: 'view-product',
        label: 'Xem sản phẩm',
        type: 'redirect',
        style: 'primary'
      }
    ]
  },
  {
    id: '3',
    title: 'Chu kỳ billing đã cập nhật',
    body: 'Gói Pro đã gia hạn. Hóa đơn tiếp theo vào ngày 24/04/2026.',
    status: 'unread',
    createdAtOffsetMs: 1000 * 60 * 60 * 2,
    actions: [
      {
        id: 'billing',
        label: 'Xem billing',
        type: 'redirect',
        style: 'primary'
      }
    ]
  },
  {
    id: '4',
    title: 'Bạn được giao công việc mới',
    body: 'Bạn được giao công việc "Update dashboard analytics" trên bảng Kanban.',
    status: 'read',
    createdAtOffsetMs: 1000 * 60 * 60 * 24,
    actions: [
      {
        id: 'open',
        label: 'Mở kanban',
        type: 'redirect',
        style: 'primary'
      }
    ]
  },
  {
    id: '5',
    title: 'Tin nhắn mới từ Alex',
    body: 'Alex gửi: "Hey, can we sync on the overview dashboard?"',
    status: 'read',
    createdAtOffsetMs: 1000 * 60 * 60 * 24 * 3,
    actions: [
      {
        id: 'open-chat',
        label: 'Mở chat',
        type: 'redirect',
        style: 'primary'
      }
    ]
  }
] as const;
