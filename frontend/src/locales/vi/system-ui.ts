export const appShellCopy = {
  accessDenied: 'Bạn không có quyền truy cập trang này.',
  toggleTheme: 'Giao diện',
  themeShortcut: 'D D',
  searchShortcutModifier: 'Ctrl',
  searchShortcutKey: 'K',
  breadcrumbLabel: 'Đường dẫn điều hướng',
  paginationLabel: 'Phân trang',
  sidebarToggle: 'Bật/tắt thanh điều hướng',
  sidebarMobileTitle: 'Thanh điều hướng',
  sidebarMobileDescription: 'Thanh điều hướng được hiển thị trên thiết bị di động.',
  theme: 'Giao diện',
  themeLight: 'Sáng',
  themeDark: 'Tối',
  themeSystem: 'Hệ thống'
} as const;

export const notFoundPageCopy = {
  title: 'Không tìm thấy nội dung',
  description: 'Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.',
  goBack: 'Quay lại',
  backToDashboard: 'Về dashboard'
} as const;

export const serviceUnavailablePageCopy = {
  metadataTitle: 'Dịch vụ tạm thời không khả dụng',
  title: 'Dịch vụ tạm thời không khả dụng',
  authSessionMessage: 'Hệ thống không thể xác minh phiên đăng nhập do dịch vụ nền đang gián đoạn.',
  defaultMessage: 'Hệ thống đang tạm thời mất kết nối tới dịch vụ nền.',
  retryAdvice:
    'Vui lòng thử lại sau ít phút. Nếu sự cố kéo dài, hãy liên hệ bộ phận IT hoặc vận hành để kiểm tra tình trạng hệ thống.',
  supportAdvice:
    'Khi liên hệ hỗ trợ, vui lòng cung cấp mã sự cố bên dưới để đối chiếu log và thời điểm xảy ra sự cố.',
  referenceIdLabel: 'Mã sự cố',
  noRequestId: 'Không có request ID',
  retry: 'Thử lại',
  backToHome: 'Về trang chủ',
  signOut: 'Đăng xuất'
} as const;

export const authSessionGateCopy = {
  restoringSession: 'Đang khôi phục phiên đăng nhập...'
} as const;

export const infoSidebarCopy = {
  defaultContent: {
    title: 'Tài liệu tham khảo',
    sections: [
      {
        title: 'Bắt đầu',
        description: 'Xem hướng dẫn cơ bản để sử dụng màn hình hiện tại.',
        links: [
          {
            title: 'Hướng dẫn sử dụng',
            url: '#'
          }
        ]
      }
    ]
  },
  learnMore: 'Xem thêm',
  noContentAvailable: 'Chưa có nội dung hướng dẫn',
  mobileTitle: 'Bảng thông tin',
  mobileDescription: 'Bảng thông tin hỗ trợ trên thiết bị di động.',
  toggle: 'Bật/tắt bảng thông tin',
  showInformation: 'Mở thông tin hướng dẫn'
} as const;

export const notificationCardCopy = {
  justNow: 'Vừa xong',
  minutesAgo: (value: number) => `${value} phút trước`,
  hoursAgo: (value: number) => `${value} giờ trước`,
  daysAgo: (value: number) => `${value} ngày trước`,
  markAsRead: 'Đánh dấu đã đọc'
} as const;

export const fileUploaderCopy = {
  dropHere: 'Thả tệp vào đây',
  selectFilePrompt: 'Kéo thả tệp vào đây hoặc bấm để chọn tệp',
  uploadLimit: (maxFiles: number, maxSize: string) =>
    maxFiles === Infinity
      ? `Có thể tải lên nhiều tệp (mỗi tệp tối đa ${maxSize})`
      : maxFiles > 1
        ? `Có thể tải lên ${maxFiles} tệp (mỗi tệp tối đa ${maxSize})`
        : `Có thể tải lên 1 tệp tối đa ${maxSize}`,
  removeFile: 'Xóa tệp'
} as const;

export const errorUiCopy = {
  referenceIdLabel: 'Mã sự cố',
  backToHome: 'Về trang chủ',
  subjects: {
    systemData: 'dữ liệu hệ thống',
    dashboard: 'dữ liệu dashboard',
    application: 'ứng dụng',
    overview: 'dữ liệu tổng quan',
    areaStats: 'thống kê khu vực',
    barStats: 'thống kê cột',
    pieStats: 'thống kê biểu đồ tròn',
    sales: 'dữ liệu doanh thu',
    positionsList: 'danh sách vị trí',
    rolesList: 'danh sách nhóm quyền',
    shiftAssignmentsList: 'danh sách gán ca',
    shiftTemplatesList: 'danh sách ca làm',
    tasksList: 'danh sách công việc',
    usersList: 'danh sách người dùng'
  }
} as const;
