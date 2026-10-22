# Tinh chỉnh UI/UX Bảng công `/attendance` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đồng nhất khung chọn/nhập/kéo ô trên bảng công 18 cột tại `/attendance` thành một hình chữ nhật duy nhất giống Excel, khóa chỉ đọc các cột công thức (`Tổng giờ`, `Công chính`, `Tăng ca`, `Thiếu công`), thu gọn cột `Ghi chú` xuống `110px`, và gỡ bỏ modal `Chấm công thủ công` cùng nút `Xóa ngày`.

**Architecture:** Quản lý viền ô đang chọn/nhập trực tiếp trên `<td>` qua `box-shadow: inset 0 0 0 2px var(--primary)` kết hợp `<input>` trong suốt đồng bộ padding/font với `<span>`; khi kéo Fill Handle qua nhiều ngày thì áp dụng các lớp cạnh trên/dưới/trái/phải (`excel-fill-range`, `excel-fill-range-top`, `excel-fill-range-bottom`) để hợp nhất thành một khung chữ nhật bao ngoài duy nhất. Thu hẹp `EditableField` và `ORDERED_FIELDS` còn đúng 11 cột cho phép nhập để điều hướng bàn phím và Paste tự động bỏ qua 5 cột kết quả tính toán.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Jest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-22-attendance-ui-ux-refinements-design.md`

## Global Constraints

- Giữ nguyên cấu trúc bảng 18 cột cố định (`table-fixed`), 2 cột ghim trái (`Ngày`, `Thứ`), header ghim trên và footer ghim dưới.
- Không thay đổi công thức tính giờ/công/tăng ca/thiếu công, không thay đổi API backend.
- Không làm phát sinh layout shift khi chuyển giữa trạng thái Chọn và Nhập; không làm giảm tốc độ cuộn 60 FPS đã tối ưu.
- Mọi bộ kiểm thử hiện có (`src/features/attendance`) và các cổng kiểm tra (`check`, `build`) phải vượt qua 100%.

## Review Focus

- Nhấn `Tab` hoặc `ArrowRight` tại ô `Trực 35k` (`duty30kHours`): con trỏ phải nhảy thẳng sang ô `Trực đêm` (`nightShift`), bỏ qua `Tổng giờ (Giờ/Phút)`, `Công chính`, `Tăng ca`, `Thiếu công`.
- Dán (Paste) nhiều cột bắt đầu từ `Trực 35k`: dữ liệu cột kế tiếp phải map vào `Trực đêm` (`nightShift`) thay vì ghi đè `workedMinutes`.
- Click hoặc double-click vào các ô `Tổng giờ (Giờ/Phút)`, `Công chính`, `Tăng ca`: không mở `<input>` và không đổi `activeCell` sang các cột công thức.
- Chuyển từ trạng thái chọn ô sang trạng thái nhập liệu (`Enter`/`F2`/gõ phím/click lần 2): thẻ `<td>` giữ nguyên `excel-active-cell` với một khung chữ nhật duy nhất, không xuất hiện viền thứ hai từ `<input>`.
- Kéo Fill Handle từ ngày 1 xuống ngày 3: các ô từ ngày 1 đến ngày 3 tạo thành một khung chữ nhật bao ngoài duy nhất (`excel-fill-range-top` ở ngày 1, `excel-fill-range-bottom` ở ngày 3), không vẽ viền ngang chia cắt giữa các dòng trong vùng kéo.

---

### Task 1: Thu hẹp `EditableField` còn 11 cột nhập và cập nhật điều hướng / Paste

**Files:**
- Modify: `apps/web/src/features/attendance/timesheet-editor/timesheet-calculations.ts:45-172`
- Modify: `apps/web/src/features/attendance/timesheet-editor/timesheet-calculations.ts:409-547`
- Modify: `apps/web/src/features/attendance/timesheet-editor/components/editable-cells.tsx:19-29`
- Test: `apps/web/src/features/attendance/timesheet-editor/components/detail-sheet.spec.ts`

**Interfaces:**
- Produces:
  - `EditableField`: `'checkInMorning' | 'checkOutMorning' | 'checkInAfternoon' | 'checkOutAfternoon' | 'breakHours' | 'personalBreakHours' | 'lunchDutyHours' | 'duty30kHours' | 'nightShift' | 'waterBooth' | 'note'`
  - `NumberCellField`: `'breakHours' | 'personalBreakHours' | 'lunchDutyHours' | 'duty30kHours' | 'nightShift' | 'waterBooth'`
  - `ORDERED_FIELDS: EditableField[]` (11 phần tử theo thứ tự cột từ trái sang phải)

- [ ] **Step 1: Viết unit test kiểm tra `ORDERED_FIELDS`, `getNextCell`, và `parseRawCellValueToUpdates` trong `detail-sheet.spec.ts`**

```ts
import {
  ORDERED_FIELDS,
  getNextCell,
} from '../timesheet-calculations';

describe('editable columns and keyboard navigation across formula columns', () => {
  it('excludes workedHours, congChinh, and otHours from ORDERED_FIELDS and jumps from duty30kHours to nightShift', () => {
    expect(ORDERED_FIELDS).toEqual([
      'checkInMorning',
      'checkOutMorning',
      'checkInAfternoon',
      'checkOutAfternoon',
      'breakHours',
      'personalBreakHours',
      'lunchDutyHours',
      'duty30kHours',
      'nightShift',
      'waterBooth',
      'note',
    ]);
    expect(getNextCell({ day: 5, field: 'duty30kHours' }, 'right', 31)).toEqual({
      day: 5,
      field: 'nightShift',
    });
    expect(getNextCell({ day: 5, field: 'nightShift' }, 'left', 31)).toEqual({
      day: 5,
      field: 'duty30kHours',
    });
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm --filter frontend test src/features/attendance/timesheet-editor/components/detail-sheet.spec.ts`
Expected: FAIL vì `ORDERED_FIELDS` hiện vẫn chứa `workedHours`, `congChinh`, `otHours`.

- [ ] **Step 3: Cập nhật `timesheet-calculations.ts` và `editable-cells.tsx`**

Loại bỏ `'workedHours' | 'congChinh' | 'otHours'` khỏi `EditableField`, `ORDERED_FIELDS`, `FIELD_LABELS`, `WEEKDAY_SHIFT_FIELDS`, `parseRawCellValueToUpdates`, `getRecordFieldDisplayValue`, `isHeaderColActive` trong `timesheet-calculations.ts` và khỏi `NumberCellField` trong `editable-cells.tsx`.

- [ ] **Step 4: Chạy lại `detail-sheet.spec.ts` để xác nhận pass**

Run: `pnpm --filter frontend test src/features/attendance/timesheet-editor/components/detail-sheet.spec.ts`
Expected: PASS

---

### Task 2: Đồng nhất khung chữ nhật kiểu Excel, khóa cột công thức, thu gọn cột Ghi chú và bỏ Modal / Xóa ngày

**Files:**
- Modify: `apps/web/src/styles/globals.css:102-186`
- Modify: `apps/web/src/features/attendance/timesheet-editor/components/editable-cells.tsx:100-739`
- Modify: `apps/web/src/features/attendance/timesheet-editor/detail-columns.ts:110`
- Modify: `apps/web/src/features/attendance/timesheet-editor/components/timesheet-toolbar.tsx:22-116`
- Modify: `apps/web/src/features/attendance/timesheet-editor/components/detail-sheet.tsx`
- Modify: `apps/web/src/features/attendance/timesheet-editor/timesheet-editor-page.tsx`
- Modify: `apps/web/src/features/attendance/timesheet-editor/components/attendance-mobile-agenda.tsx:30-38,110-118,377-390`
- Test: `apps/web/src/features/attendance/timesheet-editor/components/timesheet-benchmark.spec.tsx`

**Interfaces:**
- Consumes: `EditableField`, `NumberCellField`, `ORDERED_FIELDS` từ Task 1.
- Produces:
  - `DetailSheetProps` (không còn prop `onAdjust`)
  - `TimesheetToolbarProps` (không còn `activeDay` và `onClearActiveDay`)
  - `AttendanceMobileAgendaProps` (không còn `onAdjust`)
  - CSS classes trên `<td>`: `excel-active-cell`, `excel-fill-range`, `excel-fill-range-top`, `excel-fill-range-bottom`
  - Độ rộng cột `Ghi chú`: `110px` (`w-[110px] min-w-[110px]`)

- [ ] **Step 1: Cập nhật và bổ sung test trong `timesheet-benchmark.spec.tsx`**

Thêm các kiểm định trong `timesheet-benchmark.spec.tsx`:
1. Không hiển thị nút `Xóa ngày` trên toolbar và không hiển thị nút mở modal chấm công thủ công (`Mở giải trình / điều chỉnh audit`) ở cột `Ngày`.
2. Các cột `Tổng giờ`, `Công chính`, `Tăng ca` là chỉ đọc (click/double-click không mở `<input>`).
3. Khung chọn ô (`td.excel-active-cell`) giữ nguyên trên cùng phần tử `<td>` cả khi chọn lẫn khi đang mở `<input>` sửa ô, và cột `Ghi chú` có độ rộng `110px`.
4. Khi kéo Fill Handle từ ngày 1 xuống ngày 3, các `<td>` trong vùng kéo mang class `excel-fill-range` với `excel-fill-range-top` ở ngày đầu và `excel-fill-range-bottom` ở ngày cuối để tạo thành 1 hình chữ nhật duy nhất.

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm --filter frontend test src/features/attendance/timesheet-editor/components/timesheet-benchmark.spec.tsx`
Expected: FAIL do các cột công thức vẫn mở `<input>`, nút `Xóa ngày` và nút sửa cột `Ngày` vẫn tồn tại.

- [ ] **Step 3: Triển khai các thay đổi UI/UX trong `globals.css`, `editable-cells.tsx`, `detail-columns.ts`, `timesheet-toolbar.tsx`, `detail-sheet.tsx`, `timesheet-editor-page.tsx`, `attendance-mobile-agenda.tsx`**

1. **`apps/web/src/styles/globals.css`:**
   - Đổi `.timesheet-grid-table tbody td.excel-active-cell` sang `box-shadow: inset 0 0 0 2px var(--primary) !important; outline: none !important;`; khi đang kéo Fill Handle (`td.excel-active-cell.excel-fill-range`), nhường viền cho khung bao ngoài của `.excel-fill-range` để không xuất hiện 2 hình chữ nhật lồng nhau.
   - Định nghĩa `.excel-fill-range` chỉ vẽ viền trái/phải (`border-left`/`border-right` qua `box-shadow`), `.excel-fill-range-top` đóng viền trên, `.excel-fill-range-bottom` đóng viền dưới để hợp thành 1 hình chữ nhật duy nhất.
   - Đổi `.timesheet-grid-table tbody td input` sang `background: transparent !important;` và bỏ `padding: 0 4px !important` cứng để chữ đứng yên không nhảy vị trí khi chuyển giữa chọn và nhập.
2. **`apps/web/src/features/attendance/timesheet-editor/components/editable-cells.tsx`:**
   - Đồng bộ class hiển thị giữa `<input>` và `<span>` trong `EditableTimeCell`, `EditableNumberCell`, `EditableNoteCell`; giữ `.excel-fill-handle` nhất quán trên ô active.
3. **`apps/web/src/features/attendance/timesheet-editor/detail-columns.ts` & `detail-sheet.tsx`:**
   - Chuyển cột `Tổng giờ (Giờ)`, `Công chính`, `Tăng ca (giờ)` sang render tĩnh chỉ đọc.
   - Đặt độ rộng cột `Ghi chú` thành `110px` (`w-[110px] min-w-[110px]`, `<col style={{ width: 110 }} />`) và đồng bộ độ rộng các cột còn lại khớp `<colgroup>`.
   - Bỏ nút sửa ở cột `Ngày`, bỏ `onAdjust`, `handleAdjustDay`, `handleClearActiveDay`, và `manualOverrideDates`.
4. **`timesheet-toolbar.tsx`, `timesheet-editor-page.tsx`, `attendance-mobile-agenda.tsx`:**
   - Xóa nút `Xóa ngày XX` trong `TimesheetToolbar`.
   - Xóa `AdjustmentModal`, `adjustingDate`, `adjustingEmployee`, `handleOverrideSubmit`, `onAdjust` và các import không còn sử dụng trong `timesheet-editor-page.tsx` và `attendance-mobile-agenda.tsx`.

- [ ] **Step 4: Chạy toàn bộ test và cổng chất lượng**

Run: `pnpm --filter frontend test src/features/attendance && pnpm --filter frontend check`
Expected: Tất cả test suites PASS, `check` (`lint`, `depcruise`, `authorization:check`, `client:verify`, `typecheck`) PASS với 0 lỗi.
