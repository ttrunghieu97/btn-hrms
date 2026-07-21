export const errorPresentationCopy = {
  defaultSubject: 'dữ liệu',
  serviceUnavailable: {
    title: 'Dịch vụ tạm thời không khả dụng',
    description: (subject: string) =>
      `Không thể kết nối tới dịch vụ nền để tải ${subject}. Vui lòng thử lại sau ít phút.`,
    primaryLabel: 'Thử lại'
  },
  unauthenticated: {
    title: 'Phiên đăng nhập không hợp lệ',
    description:
      'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục.',
    primaryLabel: 'Đăng nhập lại'
  },
  forbidden: {
    title: 'Không đủ quyền truy cập',
    description: (subject: string) =>
      `Bạn không có quyền truy cập ${subject}. Nếu cần, hãy liên hệ quản trị viên.`,
    primaryLabel: 'Về trang chủ'
  },
  notFound: {
    title: 'Không tìm thấy dữ liệu',
    description: (subject: string) => `${subject} không tồn tại hoặc đã bị xóa.`,
    primaryLabel: 'Về trang chủ'
  },
  validation: {
    title: 'Dữ liệu chưa hợp lệ',
    description: (subject: string) =>
      `Thông tin ${subject} chưa hợp lệ. Vui lòng kiểm tra lại rồi thử lại.`,
    primaryLabel: 'Thử lại'
  },
  conflict: {
    title: 'Dữ liệu đã thay đổi',
    description: (subject: string) =>
      `${subject} đã tồn tại hoặc vừa được cập nhật bởi yêu cầu khác. Vui lòng tải lại và thử lại.`,
    primaryLabel: 'Thử lại'
  },
  rateLimit: {
    title: 'Thao tác quá nhanh',
    description:
      'Hệ thống tạm thời giới hạn tốc độ xử lý. Vui lòng đợi ít phút rồi thử lại.',
    primaryLabel: 'Thử lại'
  },
  generic: {
    title: 'Không thể xử lý yêu cầu',
    description: (subject: string) =>
      `Đã xảy ra lỗi khi tải ${subject}. Vui lòng thử lại.`,
    primaryLabel: 'Thử lại'
  }
} as const;
