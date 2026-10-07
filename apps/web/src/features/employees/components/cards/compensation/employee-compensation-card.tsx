'use client';

import * as React from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useEmployeeAllowancesQuery,
  useEmployeeSalaryQuery,
  useCreateAllowanceMutation,
  useUpdateAllowanceMutation,
  useDeleteAllowanceMutation,
  useUpsertSalaryMutation,
  type EmployeeAllowance,
  type AllowanceType,
} from '../../../api/compensation';
import {
  ALLOWANCE_TYPE_CONFIG,
  getStandardAllowanceSuggestion,
} from '../../../utils/compensation-standards';
import { cn } from '@/lib/utils';
import { formatDateVN } from '@/lib/date';

interface EmployeeCompensationCardProps {
  employeeId: string;
  jobTitle?: string | null;
  departmentName?: string | null;
}

export function EmployeeCompensationCard({
  employeeId,
  jobTitle,
  departmentName,
}: EmployeeCompensationCardProps) {
  // Queries
  const { data: salary, isLoading: salaryLoading } = useEmployeeSalaryQuery(employeeId);
  const { data: allowances = [], isLoading: allowancesLoading } = useEmployeeAllowancesQuery(employeeId);

  // Mutations
  const createAllowanceMutation = useCreateAllowanceMutation(employeeId);
  const updateAllowanceMutation = useUpdateAllowanceMutation(employeeId);
  const deleteAllowanceMutation = useDeleteAllowanceMutation(employeeId);
  const upsertSalaryMutation = useUpsertSalaryMutation(employeeId);

  // Dialog states
  const [salaryOpen, setSalaryOpen] = React.useState(false);
  const [salaryAmount, setSalaryAmount] = React.useState('');
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = React.useState('');

  const [addOpen, setAddOpen] = React.useState(false);
  const [addType, setAddType] = React.useState<AllowanceType>('position');
  const [addAmount, setAddAmount] = React.useState('');
  const [addNote, setAddNote] = React.useState('');
  const [addEffectiveFrom, setAddEffectiveFrom] = React.useState('');
  const [addEffectiveTo, setAddEffectiveTo] = React.useState('');

  const [editingAllowance, setEditingAllowance] = React.useState<EmployeeAllowance | null>(null);
  const [editType, setEditType] = React.useState<AllowanceType>('position');
  const [editAmount, setEditAmount] = React.useState('');
  const [editNote, setEditNote] = React.useState('');
  const [editEffectiveFrom, setEditEffectiveFrom] = React.useState('');
  const [editEffectiveTo, setEditEffectiveTo] = React.useState('');

  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Smart suggestion from job title
  const suggestion = React.useMemo(() => getStandardAllowanceSuggestion(jobTitle), [jobTitle]);
  const hasPositionAllowance = allowances.some((a) => a.type === 'position');

  // Pre-fill salary modal
  React.useEffect(() => {
    if (salaryOpen) {
      setSalaryAmount(salary?.baseSalary != null ? String(salary.baseSalary) : '4200.00');
      setSalaryEffectiveFrom(salary?.effectiveFrom ?? new Date().toISOString().slice(0, 10));
    }
  }, [salaryOpen, salary]);

  // Pre-fill add modal
  const handleOpenAdd = () => {
    if (suggestion && !hasPositionAllowance) {
      setAddType('position');
      setAddAmount(String(suggestion.amount));
      setAddNote(suggestion.note);
    } else {
      setAddType('position');
      setAddAmount('');
      setAddNote('');
    }
    setAddEffectiveFrom(new Date().toISOString().slice(0, 10));
    setAddEffectiveTo('');
    setAddOpen(true);
  };

  const handleApplySuggestion = () => {
    if (!suggestion) return;
    setAddType('position');
    setAddAmount(String(suggestion.amount));
    setAddNote(suggestion.note);
    setAddEffectiveFrom(new Date().toISOString().slice(0, 10));
    setAddOpen(true);
  };

  // Pre-fill edit modal
  const handleOpenEdit = (a: EmployeeAllowance) => {
    setEditingAllowance(a);
    setEditType(a.type);
    setEditAmount(String(a.amount));
    setEditNote(a.note ?? '');
    setEditEffectiveFrom(a.effectiveFrom ?? '');
    setEditEffectiveTo(a.effectiveTo ?? '');
  };

  // Calculations
  const baseSalaryNum = salary?.baseSalary != null ? Number(salary.baseSalary) : 0;
  const totalAllowancesNum = allowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalFixedComp = baseSalaryNum + totalAllowancesNum;

  // Handlers
  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryAmount || isNaN(Number(salaryAmount))) return;
    await upsertSalaryMutation.mutateAsync({
      employeeId,
      baseSalary: Number(salaryAmount).toFixed(2),
      effectiveFrom: salaryEffectiveFrom || new Date().toISOString().slice(0, 10),
      payFrequency: 'monthly',
      currency: 'VND',
      isCurrent: true,
    });
    setSalaryOpen(false);
  };

  const handleCreateAllowance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAmount || isNaN(Number(addAmount))) return;
    await createAllowanceMutation.mutateAsync({
      type: addType,
      amount: Number(addAmount),
      effectiveFrom: addEffectiveFrom || new Date().toISOString().slice(0, 10),
      effectiveTo: addEffectiveTo || undefined,
      note: addNote.trim() || undefined,
    });
    setAddOpen(false);
  };

  const handleUpdateAllowance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAllowance || !editAmount || isNaN(Number(editAmount))) return;
    await updateAllowanceMutation.mutateAsync({
      allowanceId: editingAllowance.id,
      dto: {
        type: editType,
        amount: Number(editAmount),
        effectiveFrom: editEffectiveFrom || undefined,
        effectiveTo: editEffectiveTo || undefined,
        note: editNote.trim() || undefined,
      },
    });
    setEditingAllowance(null);
  };

  const handleDeleteAllowance = async () => {
    if (!deletingId) return;
    await deleteAllowanceMutation.mutateAsync(deletingId);
    setDeletingId(null);
  };

  const isLoading = salaryLoading || allowancesLoading;

  return (
    <div className="rounded-xl border bg-card/60 shadow-sm border-l-4 border-l-primary hover:shadow-md transition-all duration-300">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 bg-muted/10">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
            <Icons.creditCard className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground/90">Lương & Phụ cấp đãi ngộ</h3>
            <p className="text-muted-foreground text-xs">
              Cấu trúc lương cơ bản và các khoản phụ cấp trách nhiệm hàng tháng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setSalaryOpen(true)}
          >
            <Icons.edit className="size-3.5" /> Điều chỉnh LCB
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleOpenAdd}
          >
            <Icons.add className="size-3.5" /> Thêm phụ cấp
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
            <Icons.spinner className="size-4 animate-spin" /> Đang tải thông tin lương & phụ cấp…
          </div>
        ) : (
          <>
            {/* 1. Lương cơ bản Summary Box */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Lương cơ bản (LCB):</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xl font-extrabold text-foreground tracking-tight">
                    {baseSalaryNum > 0 ? baseSalaryNum.toFixed(2) : '0.00'}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">VND / tháng</span>
                  {salary?.isCurrent && (
                    <Badge variant="success" className="text-[10px]">
                      Đang áp dụng
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Hiệu lực từ: <span className="font-mono font-medium text-foreground">{salary?.effectiveFrom ? formatDateVN(salary.effectiveFrom) : '01/01/2026'}</span>
                  {' · '}Kỳ hạn: <span className="font-medium text-foreground">Hàng tháng</span>
                </p>
              </div>

              {/* Quick KPI Overview */}
              <div className="flex items-center gap-4 bg-card border rounded-lg px-3 py-2 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground block text-[10px] font-sans">Đơn giá ngày công</span>
                  <span className="font-bold text-foreground">
                    {baseSalaryNum > 0 ? (baseSalaryNum / 26).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="h-6 w-px bg-border/60" />
                <div>
                  <span className="text-muted-foreground block text-[10px] font-sans">Tổng phụ cấp</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {totalAllowancesNum.toFixed(2)}
                  </span>
                </div>
                <div className="h-6 w-px bg-border/60" />
                <div>
                  <span className="text-muted-foreground block text-[10px] font-sans">Tổng cố định</span>
                  <span className="font-extrabold text-primary">
                    {totalFixedComp.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Smart Suggestion Banner if position holds standard allowance */}
            {suggestion && !hasPositionAllowance && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <Icons.sparkles className="size-4 shrink-0" />
                  <span>
                    Nhân viên giữ chức danh <strong>{jobTitle}</strong>. Chuẩn quy chế công ty: phụ cấp trách nhiệm{' '}
                    <strong>{suggestion.amount.toFixed(2)} VND</strong>.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-purple-400 text-purple-700 hover:bg-purple-500/20 dark:text-purple-300"
                  onClick={handleApplySuggestion}
                >
                  Áp dụng chuẩn ngay
                </Button>
              </div>
            )}

            {/* 3. Danh sách Phụ cấp */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Các khoản phụ cấp hàng tháng ({allowances.length})
                </h4>
              </div>

              {allowances.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                  Chưa có khoản phụ cấp nào được thiết lập cho nhân viên này.
                  <div className="mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleOpenAdd} className="text-xs h-7">
                      <Icons.add className="mr-1 size-3" /> Thêm phụ cấp đầu tiên
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="divide-y rounded-lg border border-border/60 bg-card overflow-hidden">
                  {allowances.map((a) => {
                    const cfg = ALLOWANCE_TYPE_CONFIG[a.type] ?? ALLOWANCE_TYPE_CONFIG.additional;
                    const isPosition = a.type === 'position';
                    return (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={cn('size-2 rounded-full mt-1.5 shrink-0', isPosition ? 'bg-purple-500' : 'bg-blue-500')} />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground">
                                {a.note || cfg?.label || 'Phụ cấp'}
                              </span>
                              <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium border', cfg?.color)}>
                                {cfg?.label}
                              </span>
                              {isPosition && jobTitle && (
                                <Badge variant="outline" className="text-[10px] font-mono text-purple-600 border-purple-300">
                                  {jobTitle}
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-[11px] mt-0.5">
                              Hiệu lực: <span className="font-mono">{formatDateVN(a.effectiveFrom)}</span>
                              {a.effectiveTo ? ` → ${formatDateVN(a.effectiveTo)}` : ' → Hiện tại'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            +{Number(a.amount).toFixed(2)} VND
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEdit(a)}
                            >
                              <Icons.edit className="size-3.5" />
                              <span className="sr-only">Sửa</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeletingId(a.id)}
                            >
                              <Icons.trash className="size-3.5" />
                              <span className="sr-only">Xoá</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Modal 1: Điều chỉnh Lương cơ bản ── */}
      <Dialog open={salaryOpen} onOpenChange={setSalaryOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Điều chỉnh Lương cơ bản (LCB)</DialogTitle>
            <DialogDescription>
              Mức lương cơ sở được ký theo hợp đồng và dùng để tính ngày công, tăng ca và đối soát bảng chấm công.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSalary} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="salary-amount">Mức Lương cơ bản (VND) *</Label>
              <Input
                id="salary-amount"
                type="number"
                step="0.01"
                required
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
                placeholder="Ví dụ: 4200.00"
                className="font-mono"
              />
              <p className="text-muted-foreground text-[11px]">
                Ngày công chuẩn tương ứng: <span className="font-mono font-bold text-foreground">{salaryAmount ? (Number(salaryAmount) / 26).toFixed(2) : '0.00'} VND / ngày</span> (chia 26 công).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="salary-effective">Ngày bắt đầu hiệu lực *</Label>
              <Input
                id="salary-effective"
                type="date"
                required
                value={salaryEffectiveFrom}
                onChange={(e) => setSalaryEffectiveFrom(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSalaryOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" isLoading={upsertSalaryMutation.isPending}>
                {upsertSalaryMutation.isPending ? 'Đang lưu…' : 'Lưu mức LCB'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal 2: Thêm Phụ cấp ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Thêm khoản phụ cấp đãi ngộ</DialogTitle>
            <DialogDescription>
              Gán phụ cấp trách nhiệm, chức vụ hoặc các đãi ngộ hàng tháng cho nhân viên.
            </DialogDescription>
          </DialogHeader>

          {suggestion && (
            <div className="rounded-md border border-purple-300 bg-purple-50 dark:bg-purple-950/30 p-2.5 text-xs text-purple-800 dark:text-purple-300 flex items-center justify-between gap-2">
              <span>
                Gợi ý chức vụ <strong>{jobTitle}</strong>: chuẩn <strong>{suggestion.amount.toFixed(2)} VND</strong>.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 text-[11px] px-2 border-purple-400"
                onClick={() => {
                  setAddType('position');
                  setAddAmount(String(suggestion.amount));
                  setAddNote(suggestion.note);
                }}
              >
                Điền nhanh
              </Button>
            </div>
          )}

          <form onSubmit={handleCreateAllowance} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label>Loại phụ cấp *</Label>
              <Select value={addType} onValueChange={(v) => setAddType(v as AllowanceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="position">Phụ cấp chức vụ / Trách nhiệm (position)</SelectItem>
                  <SelectItem value="salary">Phụ cấp theo lương (salary)</SelectItem>
                  <SelectItem value="seniority">Phụ cấp thâm niên (seniority)</SelectItem>
                  <SelectItem value="professional_seniority">Phụ cấp thâm niên nghề</SelectItem>
                  <SelectItem value="additional">Đãi ngộ khác (ăn trưa, xăng xe, điện thoại...)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-note">Tên khoản phụ cấp / Ghi chú</Label>
              <Input
                id="add-note"
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                placeholder="Ví dụ: Phụ cấp chức vụ Tổ trưởng Kỹ thuật"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-amount">Mức phụ cấp (VND) *</Label>
              <Input
                id="add-amount"
                type="number"
                step="0.01"
                required
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="Ví dụ: 1000.00 hoặc 1300.00"
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-from">Hiệu lực từ *</Label>
                <Input
                  id="add-from"
                  type="date"
                  required
                  value={addEffectiveFrom}
                  onChange={(e) => setAddEffectiveFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-to">Đến ngày (tuỳ chọn)</Label>
                <Input
                  id="add-to"
                  type="date"
                  value={addEffectiveTo}
                  onChange={(e) => setAddEffectiveTo(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" isLoading={createAllowanceMutation.isPending}>
                {createAllowanceMutation.isPending ? 'Đang lưu…' : 'Thêm phụ cấp'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal 3: Sửa Phụ cấp ── */}
      <Dialog open={Boolean(editingAllowance)} onOpenChange={(o) => !o && setEditingAllowance(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa khoản phụ cấp</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateAllowance} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label>Loại phụ cấp *</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as AllowanceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="position">Phụ cấp chức vụ / Trách nhiệm (position)</SelectItem>
                  <SelectItem value="salary">Phụ cấp theo lương (salary)</SelectItem>
                  <SelectItem value="seniority">Phụ cấp thâm niên (seniority)</SelectItem>
                  <SelectItem value="professional_seniority">Phụ cấp thâm niên nghề</SelectItem>
                  <SelectItem value="additional">Đãi ngộ khác (ăn trưa, xăng xe...)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-note">Tên khoản phụ cấp / Ghi chú</Label>
              <Input
                id="edit-note"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Mức phụ cấp (VND) *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-from">Hiệu lực từ *</Label>
                <Input
                  id="edit-from"
                  type="date"
                  required
                  value={editEffectiveFrom}
                  onChange={(e) => setEditEffectiveFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-to">Đến ngày</Label>
                <Input
                  id="edit-to"
                  type="date"
                  value={editEffectiveTo}
                  onChange={(e) => setEditEffectiveTo(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingAllowance(null)}>
                Hủy
              </Button>
              <Button type="submit" isLoading={updateAllowanceMutation.isPending}>
                {updateAllowanceMutation.isPending ? 'Đang lưu…' : 'Cập nhật'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal 4: Xác nhận xoá ── */}
      <AlertDialog open={Boolean(deletingId)} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xoá phụ cấp</AlertDialogTitle>
            <AlertDialogDescription>
              Khoản phụ cấp này sẽ bị xoá khỏi hồ sơ nhân viên và không còn được tính vào bảng chấm công các kỳ tới.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingId(null)}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllowance}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xác nhận xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
