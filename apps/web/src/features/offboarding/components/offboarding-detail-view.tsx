"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useOffboardingDetail } from "../queries";
import {
  useCompleteChecklistItem,
  useDecideClearance,
  useScheduleExitInterview,
  useRecordExitInterview,
  useCompleteOffboarding,
} from "../api/mutations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateVN } from "@/lib/date";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge, type StatusMap } from "@/components/ui/status-badge";
import { QueryErrorAlert } from "@/components/errors/query-error-alert";
import { Icons } from "@/components/icons";
import { commonUiCopy } from "@/lib/app-copy";
import { GlobalWorkflowHero, type WorkflowStep } from "@/components/workflow/global-workflow-hero";

const OFFBOARDING_STATUS_MAP: StatusMap = {
  initiated: { label: "Khởi tạo", variant: "outline" },
  in_progress: { label: "Đang xử lý", variant: "secondary" },
  clearance_pending: { label: "Chờ duyệt", variant: "outline" },
  awaiting_settlement: { label: "Chờ thanh toán", variant: "secondary" },
  completed: { label: "Hoàn tất", variant: "default" },
  cancelled: { label: "Đã hủy", variant: "destructive" },
};

const OFFBOARDING_STEPS: WorkflowStep[] = [
  { key: "initiated", label: "1. Khởi tạo", description: "Đăng ký thôi việc" },
  { key: "in_progress", label: "2. Bàn giao", description: "Checklist công việc & thiết bị" },
  { key: "clearance_pending", label: "3. Duyệt phòng ban", description: "IT, Tài chính duyệt" },
  { key: "awaiting_settlement", label: "4. Quyết toán", description: "Chi trả lương & trợ cấp" },
  { key: "completed", label: "5. Hoàn tất", description: "Chấm dứt hợp đồng lao động" },
];

const CLEARANCE_STATUS_MAP: StatusMap = {
  pending: { label: "Chờ duyệt", variant: "outline" },
  approved: { label: "Đã duyệt", variant: "default" },
  rejected: { label: "Từ chối", variant: "destructive" },
};

const CHECKLIST_STATUS_MAP: StatusMap = {
  pending: { label: "Chờ xử lý", variant: "outline" },
  completed: { label: "Hoàn tất", variant: "default" },
  skipped: { label: "Bỏ qua", variant: "secondary" },
};

interface ChecklistItem {
  id: string;
  title: string;
  mandatory: boolean;
  status: string;
  isCompleted: boolean;
  completedAt?: string | null;
}

interface ClearanceItem {
  id: string;
  department: string;
  decision: string;
  decidedAt?: string | null;
  note?: string | null;
}

interface DetailProps {
  processId: string;
}

export function OffboardingDetailView({ processId }: DetailProps) {
  const { data, error, isLoading, refetch } = useOffboardingDetail(processId);
  const completeItem = useCompleteChecklistItem();
  const decideClearance = useDecideClearance();
  const scheduleInterview = useScheduleExitInterview();
  const recordInterview = useRecordExitInterview();
  const completeOffboarding = useCompleteOffboarding();

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    interviewerUserId: "",
    scheduledAt: "",
  });
  const [recordNote, setRecordNote] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);

  const process = data as
    | {
        id: string;
        employeeId: string;
        status: string;
        startDate: string;
        targetEndDate?: string | null;
        completedAt?: string | null;
        checklistItems: ChecklistItem[];
        clearances: ClearanceItem[];
        exitInterview?: {
          id: string;
          scheduledAt: string | null;
          conductedAt: string | null;
        } | null;
        settlement?: {
          status: string;
          isOutstanding: boolean;
        } | null;
      }
    | undefined;

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <QueryErrorAlert
          error={error}
          subject="Chi tiết offboarding"
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!process) {
    return <div className="text-muted-foreground text-sm p-6">Không tìm thấy quy trình</div>;
  }

  const isCompleted = process.status === "completed";
  const canComplete =
    !isCompleted &&
    process.checklistItems?.every((i: ChecklistItem) => i.isCompleted || !i.mandatory) &&
    process.clearances?.every((c: ClearanceItem) => c.decision === "approved");

  const canDecideClearance = (c: ClearanceItem) => !isCompleted && c.decision === "pending";
  const canDoTask = (t: ChecklistItem) => !isCompleted && !t.isCompleted;
  const hasExitInterview = process.exitInterview?.scheduledAt;

  let currentStepIndex = 0;
  if (process.status === "initiated") currentStepIndex = 0;
  else if (process.status === "in_progress") currentStepIndex = 1;
  else if (process.status === "clearance_pending") currentStepIndex = 2;
  else if (process.status === "awaiting_settlement") currentStepIndex = 3;
  else if (process.status === "completed") currentStepIndex = 4;

  const failedStepIndex = process.status === "cancelled" ? currentStepIndex : undefined;

  const checklistPendingCount =
    process.checklistItems?.filter((i: ChecklistItem) => !i.isCompleted && i.mandatory).length ?? 0;
  const clearancePendingCount =
    process.clearances?.filter((c: ClearanceItem) => c.decision === "pending").length ?? 0;

  let nextActor = "Phòng Nhân sự & Quản lý";
  let actionGuidance = "Kiểm tra và theo dõi tiến trình thôi việc.";
  let actionResultPreview = "";

  if (process.status === "initiated") {
    nextActor = "Nhân viên & Người quản lý trực tiếp";
    actionGuidance =
      "Nhân viên bắt đầu tiếp nhận danh sách bàn giao và chuyển giao tài liệu công việc.";
    actionResultPreview = "Chuyển sang trạng thái Bàn giao công việc.";
  } else if (process.status === "in_progress") {
    nextActor = "Nhân viên thôi việc";
    actionGuidance =
      checklistPendingCount > 0
        ? `Còn ${checklistPendingCount} mục bàn giao bắt buộc chưa hoàn tất. Nhân viên cần hoàn tất toàn bộ checklist.`
        : "Tất cả checklist đã hoàn tất. Các phòng ban tiến hành xét duyệt bàn giao (Clearance).";
    actionResultPreview = "Chuyển sang trạng thái Phê duyệt phòng ban.";
  } else if (process.status === "clearance_pending") {
    nextActor = "Trưởng các bộ phận (IT, Kế toán, Hành chính)";
    actionGuidance =
      clearancePendingCount > 0
        ? `Còn ${clearancePendingCount} phòng ban cần xác nhận bàn giao thiết bị, tài sản và công nợ.`
        : "Tất cả phòng ban đã phê duyệt bàn giao. Chuyển sang bước quyết toán chi trả.";
    actionResultPreview = "Chuyển sang trạng thái Quyết toán chế độ.";
  } else if (process.status === "awaiting_settlement") {
    nextActor = "Kế toán tiền lương & Tài chính";
    actionGuidance =
      "Kiểm tra các khoản lương còn lại, ngày phép chưa nghỉ và thực hiện thanh toán dứt điểm.";
    actionResultPreview = "Sẵn sàng bấm Hoàn tất quy trình để đóng hồ sơ nhân viên.";
  } else if (process.status === "completed") {
    nextActor = "Đã hoàn tất quy trình";
    actionGuidance =
      "Quy trình thôi việc đã kết thúc thành công. Hợp đồng lao động và quyền truy cập đã được đóng.";
    actionResultPreview = "Nhân viên chuyển sang trạng thái Đã thôi việc (Terminated).";
  } else if (process.status === "cancelled") {
    nextActor = "Quy trình đã hủy";
    actionGuidance = "Thủ tục thôi việc đã bị hủy bỏ bởi ban quản lý.";
  }

  const heroActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" asChild className="text-xs h-8">
        <Link href="/offboarding">
          <Icons.chevronLeft className="mr-1 size-3.5" />
          Quay lại danh sách
        </Link>
      </Button>
      {canComplete && (
        <Button
          size="sm"
          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium gap-1.5"
          onClick={() => completeOffboarding.mutate(processId)}
          disabled={completeOffboarding.isPending}
        >
          {completeOffboarding.isPending && <Icons.spinner className="size-3.5 animate-spin" />}
          <Icons.check className="size-3.5" />
          Hoàn tất quy trình
        </Button>
      )}
    </div>
  );

  const endDateText = process.completedAt
    ? formatDateVN(process.completedAt)
    : process.targetEndDate
      ? formatDateVN(process.targetEndDate)
      : "—";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
      {/* Workflow Hero */}
      <GlobalWorkflowHero
        title={`Thôi việc: Nhân viên ${process.employeeId}`}
        badge={<StatusBadge status={process.status} mapping={OFFBOARDING_STATUS_MAP} />}
        subtitle={`Ngày bắt đầu: ${process.startDate ? formatDateVN(process.startDate) : "—"} • Dự kiến kết thúc: ${endDateText} • Mã quy trình: ${process.id.slice(0, 8)}`}
        steps={OFFBOARDING_STEPS}
        currentStepIndex={currentStepIndex}
        failedStepIndex={failedStepIndex}
        nextActor={nextActor}
        actionGuidance={actionGuidance}
        actionResultPreview={actionResultPreview}
        actions={heroActions}
      />

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          {process.checklistItems?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có mục nào</p>
          ) : (
            <div className="space-y-2">
              {(process.checklistItems ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded border p-3">
                  <div className="flex items-center gap-2">
                    <span className={item.isCompleted ? "line-through text-muted-foreground" : ""}>
                      {item.title}
                    </span>
                    {item.mandatory && (
                      <Badge variant="outline" className="text-xs">
                        Bắt buộc
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} mapping={CHECKLIST_STATUS_MAP} />
                    {canDoTask(item) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => completeItem.mutate({ processId, taskId: item.id })}
                        disabled={completeItem.isPending}
                      >
                        Hoàn tất
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clearances */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clearance từ phòng ban</CardTitle>
        </CardHeader>
        <CardContent>
          {process.clearances?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có clearance nào</p>
          ) : (
            <div className="space-y-2">
              {(process.clearances ?? []).map((clearance) => (
                <div
                  key={clearance.id}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{clearance.department}</p>
                    {clearance.note && (
                      <p className="text-xs text-muted-foreground">{clearance.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={clearance.decision} mapping={CLEARANCE_STATUS_MAP} />
                    {canDecideClearance(clearance) && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() =>
                            decideClearance.mutate({
                              processId,
                              department: clearance.department,
                              decision: "approved",
                            })
                          }
                          disabled={decideClearance.isPending}
                        >
                          Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            decideClearance.mutate({
                              processId,
                              department: clearance.department,
                              decision: "rejected",
                            })
                          }
                          disabled={decideClearance.isPending}
                        >
                          Từ chối
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exit Interview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phỏng vấn thôi việc</CardTitle>
        </CardHeader>
        <CardContent>
          {hasExitInterview ? (
            <div className="space-y-2">
              <p className="text-sm">Lịch hẹn: {process.exitInterview?.scheduledAt ?? "—"}</p>
              {process.exitInterview?.conductedAt ? (
                <p className="text-sm text-muted-foreground">
                  Đã phỏng vấn lúc: {process.exitInterview.conductedAt}
                </p>
              ) : (
                <div className="flex gap-2">
                  <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        Ghi nhận phỏng vấn
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ghi nhận phỏng vấn</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label>Ghi chú</Label>
                          <Textarea
                            value={recordNote}
                            onChange={(e) => setRecordNote(e.target.value)}
                            placeholder="Kết quả phỏng vấn..."
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setRecordOpen(false)}>
                          Hủy
                        </Button>
                        <Button
                          onClick={() => {
                            recordInterview.mutate({
                              processId,
                              notes: recordNote || undefined,
                            });
                            setRecordOpen(false);
                          }}
                          disabled={recordInterview.isPending}
                        >
                          Lưu
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          ) : (
            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Lên lịch phỏng vấn</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Lên lịch phỏng vấn thôi việc</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Người phỏng vấn (User ID)</Label>
                    <Input
                      value={scheduleForm.interviewerUserId}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, interviewerUserId: e.target.value })
                      }
                      placeholder="Nhập User ID..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Thời gian</Label>
                    <Input
                      type="datetime-local"
                      value={scheduleForm.scheduledAt}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                    Hủy
                  </Button>
                  <Button
                    onClick={() => {
                      scheduleInterview.mutate({
                        processId,
                        employeeId: process.employeeId,
                        ...scheduleForm,
                      });
                      setScheduleOpen(false);
                    }}
                    disabled={scheduleInterview.isPending || !scheduleForm.scheduledAt}
                  >
                    Lưu
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Settlement info */}
      {process.settlement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thanh toán cuối cùng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <StatusBadge
                status={process.settlement.isOutstanding ? "outstanding" : "settled"}
                mapping={{
                  outstanding: { label: "Chưa thanh toán", variant: "outline" },
                  settled: { label: "Đã thanh toán", variant: "default" },
                }}
              />
              <span className="text-sm text-muted-foreground">
                Trạng thái: {process.settlement.status}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete button */}
      {canComplete && (
        <div className="flex justify-end">
          <Button
            onClick={() => completeOffboarding.mutate(processId)}
            disabled={completeOffboarding.isPending}
          >
            {completeOffboarding.isPending ? "Đang xử lý..." : "Hoàn tất quy trình"}
          </Button>
        </div>
      )}
    </div>
  );
}
