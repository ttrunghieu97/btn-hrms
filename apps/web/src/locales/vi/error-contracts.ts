import { errorMessageCopy } from './error-messages';

export const backendErrorContractCopy = {
  AUTH_REFRESH_INVALID: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  AUTH_INVALID_CREDENTIALS: 'Sai tài khoản hoặc mật khẩu.',
  AUTH_TOKEN_INVALID: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  AUTH_TOKEN_MISSING: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.',
  FORBIDDEN: 'Bạn không đủ quyền thực hiện thao tác này.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra và thử lại.',
  INVALID_REQUEST: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại dữ liệu gửi lên.',
  CONFLICT: 'Dữ liệu đã thay đổi hoặc đã tồn tại. Vui lòng tải lại và thử lại.',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  EMPLOYEE_CODE_ALREADY_EXISTS: 'Mã nhân viên đã tồn tại.',
  USERNAME_ALREADY_EXISTS: 'Tên đăng nhập đã tồn tại.',
  EMAIL_ALREADY_EXISTS: 'Email đã tồn tại.',
  EMPLOYEE_NOT_FOUND: 'Không tìm thấy nhân viên.',
  DEPARTMENT_NOT_FOUND: 'Không tìm thấy phòng ban.',
  POSITION_NOT_FOUND: 'Không tìm thấy vị trí.',
  FILE_REQUIRED: 'Vui lòng chọn tệp.',
  FILE_TOKEN_NOT_FOUND:
    'Tệp tải lên đã hết hiệu lực. Vui lòng chọn lại tệp rồi thử lại.',
  FILE_TOKEN_EXPIRED:
    'Tệp tải lên đã hết hiệu lực. Vui lòng chọn lại tệp rồi thử lại.',
  EMPLOYEE_PROFILE_REQUIRED: 'Tài khoản này chưa được gán hồ sơ nhân viên.',
  OUTSIDE_WORK_AREA: 'Bạn đang ở ngoài khu vực cho phép chấm công.',
  GEOFENCE_VIOLATION:
    'Vị trí hiện tại không nằm trong khu vực cho phép chấm công.',
  IP_NOT_WHITELISTED: 'Địa chỉ IP hiện tại không được phép chấm công.',
  SELFIE_MISSING: 'Vui lòng chụp selfie để hoàn tất chấm công.',
  SELFIE_REJECTED:
    'Ảnh selfie không đạt yêu cầu. Vui lòng chụp lại rõ mặt hơn.',
  LEAVE_SELF_APPROVAL_FORBIDDEN:
    'Không thể tự phê duyệt đơn nghỉ phép của chính mình.',
  IDEMPOTENCY_IN_PROGRESS:
    'Yêu cầu đang được xử lý. Vui lòng đợi trong giây lát rồi thử lại.',
  SCHEDULE_LOCKED:
    'Kỳ roster này đang khóa hoặc chờ duyệt. Không thể thay đổi lịch làm việc.',
  SCHEDULE_CONFLICT: 'Có xung đột lịch làm việc. Vui lòng kiểm tra lại phân ca.',
  ATTENDANCE_IMAGE_UPLOAD_FORBIDDEN:
    'Môi trường này không cho phép tải ảnh thủ công để chấm công.'
} as const;

export const backendErrorDomainCopy = {
  auth: 'phiên đăng nhập',
  request: 'yêu cầu',
  user: 'người dùng',
  employee: 'nhân viên',
  department: 'phòng ban',
  position: 'vị trí',
  upload: 'tệp tải lên',
  schedule: 'lịch làm việc',
  attendance: 'dữ liệu chấm công',
  system: 'hệ thống',
  location: 'địa điểm',
  payroll: 'dữ liệu bảng lương',
  task: 'công việc',
  notification: 'mẫu thông báo',
  onboarding: 'onboarding',
  approval: 'yêu cầu phê duyệt',
  role: 'vai trò',
  integration: 'kết nối tích hợp',
  document: 'tài liệu',
  leave: 'đơn nghỉ phép',
  workflow: 'quy trình',
  chat: 'cuộc trò chuyện',
  contract: 'hợp đồng',
  recruitment: 'tuyển dụng',
  asset: 'tài sản'
} as const;

type BackendErrorMessageKind =
  | 'service-unavailable'
  | 'unauthenticated'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'not-found'
  | 'rate-limit'
  | 'generic';

function capitalize(value: string): string {
  if (!value) return value;
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function getBackendErrorContractMessage(args: {
  backendCode: string;
  domain: keyof typeof backendErrorDomainCopy;
  kind: BackendErrorMessageKind;
}): string {
  const explicit =
    backendErrorContractCopy[args.backendCode as keyof typeof backendErrorContractCopy];

  if (explicit) {
    return explicit;
  }

  const subject = backendErrorDomainCopy[args.domain] ?? backendErrorDomainCopy.system;

  switch (args.kind) {
    case 'service-unavailable':
      return errorMessageCopy.serviceUnavailable;
    case 'unauthenticated':
      return errorMessageCopy.unauthenticated;
    case 'forbidden':
      return `Bạn không đủ quyền thực hiện thao tác với ${subject}.`;
    case 'not-found':
      return `Không tìm thấy ${subject}.`;
    case 'conflict':
      if (args.backendCode.endsWith('_ALREADY_EXISTS')) {
        return `${capitalize(subject)} đã tồn tại.`;
      }
      return `${capitalize(subject)} đã thay đổi hoặc đang xung đột. Vui lòng tải lại và thử lại.`;
    case 'validation':
      if (args.backendCode.endsWith('_REQUIRED') || args.backendCode.endsWith('_MISSING')) {
        return `Vui lòng bổ sung ${subject}.`;
      }
      if (
        args.backendCode.includes('INVALID') ||
        args.backendCode.endsWith('_INELIGIBLE') ||
        args.backendCode.endsWith('_INSUFFICIENT') ||
        args.backendCode.endsWith('_IDENTICAL') ||
        args.backendCode.endsWith('_INVALID_ORDER')
      ) {
        return `Dữ liệu ${subject} không hợp lệ. Vui lòng kiểm tra và thử lại.`;
      }
      return `Không thể xử lý ${subject}. Vui lòng kiểm tra lại dữ liệu.`;
    case 'rate-limit':
      return errorMessageCopy.rateLimit;
    default:
      return errorMessageCopy.generic;
  }
}
