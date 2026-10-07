export const dashboardCopy = {
  employeeStatus: {
    title: 'Cơ cấu trạng thái nhân viên',
    totalSuffix: 'nhân viên',
    emptyState: 'Không có dữ liệu nhân viên',
  },
  departmentHeadcount: {
    title: 'Số lượng nhân sự theo phòng ban',
    emptyState: 'Không có dữ liệu phòng ban',
    departmentSuffix: 'phòng ban',
  },
  hiresLeavers: {
    title: 'Tuyển dụng vs Nghỉ việc (12 tháng)',
    hiresLabel: 'Tuyển dụng',
    leaversLabel: 'Nghỉ việc',
    emptyState: 'Không có dữ liệu tuyển dụng',
  },
  payrollCostTrend: {
    title: 'Xu hướng chi phí lương (6 kỳ)',
    emptyState: 'Không có dữ liệu lương',
    netLabel: 'Lương thực lĩnh',
  },
  attendanceToday: {
    title: 'Chấm công hôm nay',
    presentLabel: 'Có mặt',
    absentLabel: 'Vắng',
    lateLabel: 'Đi muộn',
    onTimeLabel: 'Đúng giờ',
    checkedInLabel: 'Đã chấm công',
    emptyState: 'Chưa có dữ liệu chấm công hôm nay',
  },
  attendanceExceptions: {
    title: 'Bất thường chấm công hôm nay',
    emptyState: 'Không có bất thường',
    totalPrefix: 'Bất thường',
    exceptionLabels: {
      MISSING_CHECK_IN: 'Thiếu check-in',
      MISSING_CHECK_OUT: 'Thiếu check-out',
      LATE: 'Đi muộn',
      EARLY_LEAVE: 'Về sớm',
      ABSENT: 'Vắng không phép',
      UNREPORTED_ABSENCE: 'Vắng không báo',
    },
  },
  pendingLeave: {
    title: 'Đơn nghỉ phép chờ duyệt',
    totalPrefix: 'đơn',
    unitDays: 'ngày',
    emptyState: 'Không có đơn nghỉ phép chờ duyệt',
  },
  pendingApprovals: {
    title: 'Phê duyệt chờ xử lý',
    totalPrefix: 'phê duyệt',
    emptyState: 'Không có phê duyệt chờ xử lý',
    typeLabels: {
      leave: 'Nghỉ phép',
      expense: 'Chi phí',
      overtime: 'Tăng ca',
      schedule: 'Lịch làm việc',
      hr_request: 'Yêu cầu HR',
    },
  },
  layouts: {
    executive: {
      title: 'Executive Overview',
      description: 'Quy mô, cơ cấu, tăng trưởng và xu hướng lương',
    },
    operations: {
      title: 'HR Operations',
      description: 'Chấm công hôm nay, bất thường, đơn nghỉ phép và phê duyệt',
    },
  },
  common: {
    loading: 'Đang tải',
    error: 'Không thể tải dữ liệu',
    empty: 'Không có dữ liệu',
  },
  tabs: {
    operations: 'HR Operations',
    executive: 'Executive',
  },
};
