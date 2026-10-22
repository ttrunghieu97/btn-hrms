# Thiết kế ngắn: Tinh chỉnh UI/UX Bảng công `/attendance` (2026-10-22)

## 1. Mục đích & Lý do (Intent & Why)
Làm gọn giao diện bảng công 18 cột tại `/attendance`, mang lại trải nghiệm chọn/nhập ô thống nhất chuẩn bảng tính Excel và ngăn người dùng sửa nhầm vào các cột công thức hoặc bấm nhầm các thao tác thừa.

## 2. Mục tiêu & Phi mục tiêu (Goals, Non-goals, Anti-goals)
- **Mục tiêu:**
  1. Đồng nhất khung chọn ô (`excel-active-cell`) khi di chuyển/chọn và khi nhập liệu (`<input>`) cũng như khi kéo Fill Handle (`excel-fill-range`) thành **1 khung hình chữ nhật duy nhất giống Excel**.
  2. Gỡ bỏ hoàn toàn modal **Chấm công thủ công** (`AdjustmentModal`), nút sửa ở cột `Ngày`, và luồng `onAdjust`.
  3. Gỡ bỏ nút **Xóa ngày XX** trên thanh công cụ `TimesheetToolbar` và hàm `handleClearActiveDay`.
  4. Khóa chỉ đọc các cột kết quả tính toán: **Tổng giờ (Giờ & Phút)**, **Công chính**, **Tăng ca (giờ)**, **Thiếu công (giờ)**; chỉ cho phép nhập ở 11 cột: 4 cột `Ca sáng/chiều (Vào/Ra)`, 4 cột `Nghỉ & Trực`, `Trực đêm`, `Đứng nước`, và `Ghi chú`.
  5. Thu nhỏ độ rộng cột **Ghi chú** xuống `110px` (đồng bộ ở `<colgroup>`, header, body và footer).
- **Phi mục tiêu:** Không thay đổi số lượng 18 cột, không thay đổi công thức tính giờ/công/tăng ca/thiếu công, không thay đổi API backend.
- **Anti-goals:** Không làm phát sinh layout shift khi chuyển giữa trạng thái Chọn và Nhập; không làm giảm tốc độ cuộn 60 FPS đã tối ưu.

## 3. Ràng buộc (Constraints)
- Giữ nguyên cấu trúc bảng 18 cột cố định (`table-fixed`), 2 cột ghim trái (`Ngày`, `Thứ`), header ghim trên và footer ghim dưới.
- Mọi bộ kiểm thử hiện có (`src/features/attendance`) và các cổng kiểm tra (`check`, `build`) phải vượt qua 100%.

## 4. Phương án kỹ thuật (Approaches)
- **Phương án 1 (Đã chọn):** Quản lý khung viền trực tiếp trên `<td>` bằng CSS (`box-shadow: inset 0 0 0 2px var(--primary)` cho ô đang chọn/nhập; gộp viền trên/dưới/trái/phải của vùng kéo `.excel-fill-range` và ô gốc thành 1 hình chữ nhật bao ngoài duy nhất) kết hợp `<input>` nền trong suốt (`bg-transparent`) có cùng padding/font với `<span>`.
- **Phương án 2 (Đã loại):** Dùng lớp `<div class="selection-overlay">` tách rời tính tọa độ qua `getBoundingClientRect()` — tốn chi phí tính toán khi cuộn và dễ lệch với sticky columns.

## 5. Chi tiết triển khai đã thống nhất (Decided How)
- **[`styles/globals.css`](file:///home/hieutt/btn-hrms/apps/web/src/styles/globals.css):**
  - `td.excel-active-cell`: dùng `box-shadow: inset 0 0 0 2px var(--primary) !important` thay cho `outline` để không bị thẻ `<input>` con che lấp; khi đang kéo Fill Handle qua nhiều dòng, ẩn viền cạnh tiếp giáp giữa ô gốc và vùng kéo để toàn bộ vùng từ `minDay` đến `maxDay` hợp thành **1 hình chữ nhật duy nhất**.
  - `.timesheet-grid-table tbody td input`: dùng `background: transparent !important` và bỏ `padding: 0 4px !important` cứng để kế thừa đúng căn lề của từng loại ô.
- **[`editable-cells.tsx`](file:///home/hieutt/btn-hrms/apps/web/src/features/attendance/timesheet-editor/components/editable-cells.tsx):**
  - Đồng bộ tuyệt đối class `font-weight`, `padding`, `text-align` giữa trạng thái Chọn (`<span>`) và trạng thái Nhập (`<input>`); giữ `.excel-fill-handle` nhất quán trên ô active.
  - Thu hẹp `NumberCellField` về 6 trường thực sự cho phép sửa (`breakHours`, `personalBreakHours`, `lunchDutyHours`, `duty30kHours`, `nightShift`, `waterBooth`).
- **[`timesheet-calculations.ts`](file:///home/hieutt/btn-hrms/apps/web/src/features/attendance/timesheet-editor/timesheet-calculations.ts):**
  - Loại bỏ `workedHours`, `congChinh`, `otHours` khỏi `EditableField` và `ORDERED_FIELDS` để phím `Tab` / mũi tên và thao tác Paste đi thẳng từ `Trực 35k` (`duty30kHours`) sang `Trực đêm` (`nightShift`), bỏ qua các cột công thức.
- **[`detail-columns.ts`](file:///home/hieutt/btn-hrms/apps/web/src/features/attendance/timesheet-editor/detail-columns.ts) & [`detail-sheet.tsx`](file:///home/hieutt/btn-hrms/apps/web/src/features/attendance/timesheet-editor/components/detail-sheet.tsx):**
  - Chuyển các cột **Tổng giờ (Giờ)**, **Công chính**, **Tăng ca (giờ)** trong `TimesheetDayRow` sang render chỉ đọc (`<div><span>...</span></div>`).
  - Thu nhỏ cột **Ghi chú** từ `160px–180px` xuống `110px` (`w-[110px] min-w-[110px]`) đồng bộ tại `detail-columns.ts`, `<colgroup>`, `TimesheetDayRow` và `TableFooter`.
  - Xóa nút sửa ở cột `Ngày`, prop `onAdjust`, `handleAdjustDay`, và `handleClearActiveDay`.
- **[`timesheet-toolbar.tsx`](file:///home/hieutt/btn-hrms/apps/web/src/features/attendance/timesheet-editor/components/timesheet-toolbar.tsx) & [`timesheet-editor-page.tsx`](file:///home/hieutt/btn-hrms/apps/web/src/features/attendance/timesheet-editor/timesheet-editor-page.tsx) & [`attendance-mobile-agenda.tsx`](file:///home/hieutt/btn-hrms/apps/web/src/features/attendance/timesheet-editor/components/attendance-mobile-agenda.tsx):**
  - Xóa nút `Xóa ngày XX` khỏi `TimesheetToolbar`.
  - Xóa `AdjustmentModal` cùng state `adjustingDate`/`adjustingEmployee` khỏi `TimesheetEditorPage` và bỏ nút điều chỉnh thủ công trên `AttendanceMobileAgenda`.
