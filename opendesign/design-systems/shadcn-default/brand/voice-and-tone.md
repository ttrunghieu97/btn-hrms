# Voice & Tone Guidelines — BTN HRMS

## 1. Brand Identity & Audience
BTN HRMS (Bạch Thảo Ngân HRMS) is an internal enterprise human resource and payroll management platform.
- **Audience**: HR specialists, department managers, C-level executives, and internal staff.
- **Language**: Vietnamese (`vi-VN`) as primary UI language; technical identifiers and codes in ASCII alphanumeric.
- **Tone Profile**: Professional, precise, constructive, and concise. Respectful without being overly formal or robotic.

## 2. Casing & Capitalization
- **Sentence case for all UI copy**: Buttons, tabs, modal titles, field labels, and table headers use Vietnamese sentence case.
  - Correct: *"Chốt bảng công"*, *"Thêm nhân viên mới"*, *"Lịch sử chấm công"*, *"Ca làm việc"*
  - Incorrect: *"CHỐT BẢNG CÔNG"*, *"Chốt Bảng Công"*, *"Thêm Nhân Viên Mới"*
- **System acronyms & codes**: Always uppercase:
  - `BTN HRMS`, `ID`, `KPI`, `OT`, `BHXH`, `BHYT`, `CCCD`, `MST`
  - Employee codes: `NV0042`, `NV1092`
  - Period identifiers: `2026-08`, `2026-Q3`

## 3. Numeric & Datetime Formatting
HR operations require zero ambiguity regarding dates, durations, and financial figures.
- **Dates**:
  - Full date format: `YYYY-MM-DD` (ISO) in technical views and tables (e.g., `2026-08-11`), or `DD/MM/YYYY` in user-facing form inputs.
  - Day of week: `CN`, `T2`, `T3`, `T4`, `T5`, `T6`, `T7`.
  - Period identifier: `YYYY-MM` (e.g. `2026-08`).
- **Times**:
  - 24-hour notation: `HH:mm` (e.g., `08:30`, `12:00`, `17:35`).
  - Always rendered in monospace font (`--font-mono`).
- **Durations**:
  - One decimal place with unit suffix: `8.0h`, `4.5h`, `0.5h`, `0.0h`.
- **Currency & Quantities**:
  - Vietnamese Dong formatted with dot separator: `15.000.000 ₫`.
  - Percentages: `100%`, `85.5%`.

## 4. Status Vocabulary
Status labels are succinct, uniform, and mapped directly to color semantics:
- **Success / Valid (`--status-ok`)**:
  - *"Đủ công"* (Full work credit)
  - *"Đã duyệt"* (Approved)
  - *"Đã chốt"* (Locked / Finalized)
  - *"Hoạt động"* (Active)
- **Warning / Action Required (`--status-warn`)**:
  - *"Thiếu giờ"* / *"Thiếu chấm"* (Missing clock-in/out)
  - *"Chờ duyệt"* (Pending approval)
  - *"Đi trễ"* (Late arrival)
  - *"Về sớm"* (Early departure)
- **Critical / Danger (`--status-bad`)**:
  - *"Vắng mặt"* / *"Nghỉ không phép"* (Absent without leave)
  - *"Từ chối"* (Rejected)
  - *"Chưa chấm"* (No punch recorded)
  - *"Đã khóa"* (Disabled)
- **Informational / Neutral (`--status-info`)**:
  - *"Nghỉ lễ"* (Public holiday)
  - *"Nghỉ phép"* (Annual leave)
  - *"Làm thêm (OT)"* (Overtime)
  - *"Bản nháp"* (Draft)

## 5. Action Imperatives
Action labels must be short, unambiguous verbs:
- Primary affirmative actions: *"Lưu thay đổi"*, *"Xác nhận"*, *"Chốt công"*, *"Xuất báo cáo"*
- Cancellation: *"Hủy"*, *"Đóng"*
- Destructive: *"Xóa nhân viên"*, *"Mở lại bảng công"*
- Navigation: *"Quay lại"*, *"Tiếp tục"*

## 6. Feedback & Error Messaging
- **Error Messages**: Always explain *what failed* and *how to remedy it*. Never blame the operator.
  - Correct: *"Không thể lưu công. Giờ kết thúc ca (12:00) phải sau giờ bắt đầu (08:30)."*
  - Incorrect: *"Lỗi nhập liệu! Bạn đã nhập sai giờ."*
- **Success Confirmations**: Compact and definite:
  - *"Đã cập nhật bảng công thành công."*
  - *"Đã gửi yêu cầu phê duyệt nghỉ phép."*

## 7. Emoji & Iconography Policy
- **Zero emoji in product UI**: Do not use emojis (👍, ⚠️, 🚀, ❌, etc.) in table rows, status chips, notification headers, or modal dialogues.
- **Tabler Icons**: Use clean stroke SVG icons (`@tabler/icons-react`) with standard 16px/20px sizing and currentColor stroke.
