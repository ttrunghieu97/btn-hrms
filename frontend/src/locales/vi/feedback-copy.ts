export const feedbackEntity = {
  accountPermissions: 'quyền hạn',
  assignment: 'gán ca',
  attendance: 'chấm công',
  comment: 'bình luận',
  department: 'phòng ban',
  employee: 'nhân viên',
  evidence: 'minh chứng',
  file: 'tệp',
  password: 'mật khẩu',
  payrollPeriod: 'kỳ lương',
  payrollRun: 'lần chạy lương',
  payrollInfo: 'thông tin lương',
  payrollTable: 'bảng lương',
  position: 'vị trí',
  role: 'nhóm quyền',
  roster: 'roster',
  session: 'phiên đăng nhập',
  shiftTemplate: 'ca làm',
  task: 'công việc',
  taskAttachment: 'tệp đính kèm',
  user: 'người dùng',
  userPermissions: 'phân quyền'
} as const;

export const feedbackCopy = {
  auth: {
    invalidCredentials: 'Sai tài khoản hoặc mật khẩu',
    signInSuccess: 'Đăng nhập thành công',
    signInFailed: 'Đăng nhập thất bại',
    signOutSuccess: 'Đã đăng xuất'
  },
  success: {
    added: (subject: string) => `Đã thêm ${subject}`,
    created: (subject: string) => `Đã tạo ${subject}`,
    createdNew: (subject: string) => `Đã tạo ${subject} mới`,
    updated: (subject: string) => `Đã cập nhật ${subject}`,
    saved: (subject: string) => `Đã lưu ${subject}`,
    deleted: (subject: string) => `Đã xóa ${subject}`,
    deletedPermanent: (subject: string) => `Đã xóa vĩnh viễn ${subject}`,
    restored: (subject: string) => `Đã khôi phục ${subject}`,
    archived: (subject: string) => `Đã lưu trữ ${subject}`,
    assigned: (subject: string) => `Đã gán ${subject}`,
    cancelled: (subject: string) => `Đã hủy ${subject}`,
    uploaded: (subject: string) => `Đã tải lên ${subject}`,
    passwordChanged: 'Đã đổi mật khẩu',
    passwordReset: (password: string) => `Đã đặt lại mật khẩu: ${password}`,
    rosterSubmitted: 'Đã gửi roster cho duyệt',
    rosterApproved: 'Đã duyệt roster',
    rosterRejected: 'Đã từ chối roster',
    rosterPublishedLocked: 'Đã công bố và khóa roster',
    sessionsRevoked: 'Đã thu hồi tất cả phiên đăng nhập',
    workflowAction: (label: string) => `Đã thực hiện: ${label}`,
    checkInRecorded: 'Đã ghi nhận check-in',
    checkOutRecorded: 'Đã ghi nhận check-out'
  },
  warning: {
    accessDenied: (action: string) => `Bạn không đủ quyền ${action}`,
    reviewForm: 'Vui lòng kiểm tra lại thông tin',
    fullNameRequired: 'Họ đệm và tên là bắt buộc',
    waitForUpload: 'Vui lòng chờ tệp tải lên hoàn tất',
    uploadExpired: 'Tệp tải lên đã hết hiệu lực. Vui lòng chọn lại tệp rồi lưu lại.',
    missingEmailUpload: 'Thiếu thông tin để tải lên. Vui lòng nhập email.',
    fieldRequired: (field: string) => `${field} là bắt buộc`,
    missingUsername: (action: string, subject: string) =>
      `Không thể ${action} ${subject} vì thiếu tên đăng nhập`,
    missingEmployeeIdForPasswordReset: 'Không thể đặt lại mật khẩu vì thiếu ID nhân viên',
    missingUserAccount: (name: string) => `Không tìm thấy tài khoản người dùng cho nhân viên ${name}`,
    rejectReasonRequired: 'Cần nhập lý do từ chối',
    selectEmployee: 'Vui lòng chọn nhân viên',
    rosterLocked: 'Roster kỳ này đang khóa hoặc chờ duyệt.',
    scheduleConflict: 'Có xung đột lịch làm việc.',
    useActionButton: 'Sử dụng nút thao tác để thực hiện chuyển trạng thái này',
    roleNameRequired: 'Tên nhóm quyền không được để trống',
    invalidEmail: 'Email không hợp lệ',
    certificationIncomplete: 'Chứng chỉ cần có tên, đơn vị cấp và ngày cấp',
    employeeNotFound: 'Không tìm thấy thông tin nhân viên',
    usernameChecking: 'Đang kiểm tra username',
    employeeCodeChecking: 'Đang kiểm tra mã nhân viên',
    usernameExists: 'Username đã tồn tại',
    employeeCodeExists: 'Mã nhân viên đã tồn tại',
    rateLimited: 'Thao tác quá nhanh, vui lòng thử lại sau',
    fileTooLarge: (limit: string) => `Tệp vượt quá ${limit}`
  },
  failure: {
    create: (subject: string) => `Không thể tạo ${subject}`,
    update: (subject: string) => `Không thể cập nhật ${subject}`,
    save: (subject: string) => `Không thể lưu ${subject}`,
    delete: (subject: string) => `Không thể xóa ${subject}`,
    deletePermanent: (subject: string) => `Không thể xóa vĩnh viễn ${subject}`,
    restore: (subject: string) => `Không thể khôi phục ${subject}`,
    archive: (subject: string) => `Không thể lưu trữ ${subject}`,
    upload: (subject: string) => `Không thể tải lên ${subject}`,
    assign: (subject: string) => `Không thể gán ${subject}`,
    signIn: 'Đăng nhập thất bại',
    changePassword: 'Không thể đổi mật khẩu',
    recordAttendance: 'Không thể ghi nhận chấm công',
    submitRoster: 'Không thể gửi roster',
    approveRoster: 'Không thể duyệt roster',
    rejectRoster: 'Không thể từ chối roster',
    publishRoster: 'Không thể công bố roster',
    revokeSessions: 'Không thể thu hồi phiên đăng nhập',
    processRequest: 'Không thể xử lý yêu cầu. Vui lòng thử lại',
    systemUnavailable: 'Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại sau',
    resetPassword: 'Không thể đặt lại mật khẩu',
    executeAction: 'Không thể thực hiện thao tác',
    loadOverview: 'Không thể tải dữ liệu tổng quan'
  },
  file: {
    onlyOneAtATime: 'Chỉ có thể tải lên 1 tệp mỗi lần',
    maxFiles: (maxFiles: number) => `Chỉ có thể tải lên tối đa ${maxFiles} tệp`,
    rejected: (fileName: string) => `Tệp ${fileName} không được chấp nhận`,
    uploading: (target: string) => `Đang tải lên ${target}...`,
    uploaded: (target: string) => `Đã tải lên ${target}`,
    uploadFailed: (target: string) => `Không thể tải lên ${target}`
  }
} as const;

export const validationCopy = {
  attendance: {
    invalidMonth: 'Thang khong hop le (YYYY-MM)',
    invalidDate: 'Ngay khong hop le (YYYY-MM-DD)',
    invalidTime: 'Gio khong hop le'
  },
  auth: {
    usernameRequired: 'Tai khoan bat buoc',
    usernameMax: 'Tai khoan toi da 64 ky tu',
    usernamePattern: 'Tai khoan chi chua chu, so, . _ @ -',
    passwordMin6: 'Mat khau toi thieu 6 ky tu',
    passwordMax128: 'Mat khau toi da 128 ky tu'
  },
  department: {
    nameRequired: 'Ten phong ban bat buoc'
  },
  employee: {
    emailInvalid: 'Email khong hop le',
    firstNameRequired: 'Ten bat buoc',
    lastNameRequired: 'Ho bat buoc',
    employeeCodeRequired: 'Ma nhan vien bat buoc',
    departmentUuid: 'Phong ban phai la dinh dang UUID',
    phoneInvalid: 'So dien thoai khong hop le',
    certificationNameRequired: 'Ten chung chi la bat buoc',
    certificationIssuerRequired: 'Don vi cap la bat buoc',
    certificationIssuedDateRequired: 'Ngay cap la bat buoc',
    departmentRequired: 'Phong ban la bat buoc',
    positionRequired: 'Vi tri la bat buoc'
  },
  payroll: {
    nameRequired: 'Ten ky luong bat buoc',
    dateFormat: 'Dinh dang ngay YYYY-MM-DD',
    periodRequired: 'Ky luong bat buoc'
  },
  position: {
    nameRequired: 'Ten vi tri bat buoc'
  },
  shift: {
    codeRequired: 'Ma ca la bat buoc',
    nameRequired: 'Ten ca la bat buoc',
    breakMinutesInvalid: 'Phut nghi khong hop le',
    activeWeekdaysRequired: 'Chon it nhat mot ngay hoat dong',
    plannedStatus: 'Ke hoach',
    publishedStatus: 'Da cong bo',
    employeeRequired: 'Ma nhan vien la bat buoc',
    templateRequired: 'Ca mau la bat buoc',
    noteMax: 'Ghi chu toi da 500 ky tu',
    reasonMax: 'Ly do toi da 500 ky tu'
  },
  task: {
    titleRequired: 'Tieu de bat buoc',
    assigneeUuid: 'Nguoi duoc giao phai la dinh dang UUID'
  },
  upload: {
    fileTooLarge: 'File vuot qua dung luong cho phep (5MB)',
    invalidAvatarFormat: 'Dinh dang file khong hop le (chi nhan JPG, PNG, WEBP)',
    invalidDocumentFormat: 'Dinh dang file khong hop le (chi nhan JPG, PNG, WEBP, PDF)'
  },
  changePassword: {
    currentRequired: 'Vui long nhap mat khau hien tai',
    newMin10: 'Mat khau moi phai co it nhat 10 ky tu',
    confirmRequired: 'Vui long nhap lai mat khau moi',
    confirmMismatch: 'Mat khau xac nhan khong khop',
    mustDiffer: 'Mat khau moi phai khac mat khau hien tai'
  }
} as const;

export const apiErrorFieldCopy: Record<string, string> = {
  employee_code: 'Ma nhan vien',
  username: 'Ten dang nhap',
  email: 'Email',
  first_name: 'Ten',
  last_name: 'Ho dem',
  department_id: 'Phong ban',
  position_id: 'Vi tri',
  phone_number: 'So dien thoai',
  identity_number: 'So CCCD/CMND',
  identity_place: 'Noi cap',
  dob: 'Ngay sinh',
  identity_date: 'Ngay cap',
  start_date: 'Ngay bat dau',
  end_date: 'Ngay ket thuc'
} as const;

export const apiErrorCopy = {
  backendMessages: {
    EMPLOYEE_CODE_ALREADY_EXISTS: 'Ma nhan vien da ton tai',
    USERNAME_ALREADY_EXISTS: 'Ten dang nhap da ton tai',
    EMAIL_ALREADY_EXISTS: 'Email da ton tai',
    VALIDATION_ERROR: 'Du lieu khong hop le',
    INVALID_REQUEST: 'Yeu cau khong hop le',
    FORBIDDEN: 'Ban khong co quyen thuc hien thao tac nay',
    NOT_FOUND: 'Khong tim thay du lieu',
    AUTH_INVALID_CREDENTIALS: 'Sai tai khoan hoac mat khau',
    AUTH_TOKEN_INVALID: 'Phien dang nhap khong hop le',
    AUTH_TOKEN_MISSING: 'Ban chua dang nhap',
    EMPLOYEE_NOT_FOUND: 'Khong tim thay nhan vien',
    DEPARTMENT_NOT_FOUND: 'Khong tim thay phong ban',
    POSITION_NOT_FOUND: 'Khong tim thay vi tri',
    ATTENDANCE_IMAGE_UPLOAD_FORBIDDEN:
      'Moi truong nay khong cho phep tai anh len thu cong de cham cong',
    FILE_REQUIRED: 'Vui long chon tep'
  },
  invalidField: (field: string) => `${field} khong hop le`,
  alreadyExists: (field: string) => `${field} da ton tai`,
  authExpired: 'Phien dang nhap khong hop le. Vui long dang nhap lai',
  forbidden: 'Ban khong du quyen thuc hien thao tac nay',
  notFound: 'Khong tim thay du lieu',
  networkUnavailable: 'Dich vu tam thoi khong kha dung. Vui long thu lai sau',
  systemUnavailable: 'He thong dang tam thoi gian doan. Vui long thu lai sau'
} as const;
