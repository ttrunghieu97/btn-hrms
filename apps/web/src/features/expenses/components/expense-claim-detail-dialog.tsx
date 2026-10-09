'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { Icons } from '@/components/icons';
import { formatDateVN } from '@/lib/date';
import { GlobalWorkflowHero, type WorkflowStep } from '@/components/workflow/global-workflow-hero';
import { CLAIM_STATUS_MAP, type ExpenseClaimRow, type ExpenseClaimDetailRow, type ExpenseClaimItemRow } from './status-maps';
import { expenseClaimDetailQueryOptions } from '../api/queries';
import {
  useSubmitExpenseClaim,
  useApproveExpenseClaim,
  useRejectExpenseClaim,
  useReimburseExpenseClaim,
} from '../api/mutations';
import { addExpenseClaimItem, type AddItemPayload } from '../api/expenses';
import { expenseClaimKeys } from '../queries/expense-queries';
import { toast } from 'sonner';

const EXPENSE_STEPS: WorkflowStep[] = [
  { key: 'draft', label: '1. Khởi tạo đề nghị', description: 'Kê khai các khoản chi' },
  { key: 'submitted', label: '2. Nộp xét duyệt', description: 'Chờ cấp quản lý duyệt' },
  { key: 'approved', label: '3. Phê duyệt chi phí', description: 'Kế toán đối soát chứng từ' },
  { key: 'reimbursed', label: '4. Chi trả / Hoàn ứng', description: 'Thanh toán tiền thành công' },
];

interface ExpenseClaimDetailDialogProps {
  claim: ExpenseClaimRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseClaimDetailDialog({
  claim,
  open,
  onOpenChange,
}: ExpenseClaimDetailDialogProps) {
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');
  const [addItemOpen, setAddItemOpen] = React.useState(false);
  const [itemForm, setItemForm] = React.useState({
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
  });

  const detailQuery = useQuery(
    expenseClaimDetailQueryOptions(claim?.id ?? '')
  );

  const detail = (detailQuery.data ?? claim) as ExpenseClaimDetailRow | null;
  const status = detail?.status || claim?.status || 'draft';

  const submitMutation = useSubmitExpenseClaim();
  const approveMutation = useApproveExpenseClaim();
  const rejectMutation = useRejectExpenseClaim();
  const reimburseMutation = useReimburseExpenseClaim();

  const addItemMutation = useMutation({
    mutationFn: (payload: AddItemPayload) => addExpenseClaimItem(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseClaimKeys.all() });
      if (claim?.id) {
        qc.invalidateQueries({ queryKey: expenseClaimKeys.detail(claim.id) });
      }
      toast.success('Đã thêm khoản chi');
      setAddItemOpen(false);
      setItemForm({
        description: '',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Không thể thêm khoản chi');
    },
  });

  if (!claim) return null;

  let currentStepIndex = 0;
  if (status === 'draft') currentStepIndex = 0;
  else if (status === 'submitted') currentStepIndex = 1;
  else if (status === 'approved') currentStepIndex = 2;
  else if (status === 'reimbursed' || status === 'closed') currentStepIndex = 3;

  const failedStepIndex = status === 'rejected' ? 1 : undefined;

  let nextActor = 'Nhân viên (Người tạo)';
  let actionGuidance = 'Kiểm tra thông tin và các hóa đơn đính kèm.';
  let actionResultPreview = '';

  if (status === 'draft') {
    nextActor = 'Nhân viên (Người tạo đề nghị)';
    actionGuidance =
      'Bổ sung đầy đủ các khoản chi và nhấn Nộp đề nghị để gửi lên cấp quản lý xét duyệt.';
    actionResultPreview = 'Chuyển sang trạng thái Đang chờ duyệt (Submitted).';
  } else if (status === 'submitted') {
    nextActor = 'Quản lý trực tiếp / Ban Giám đốc';
    actionGuidance =
      'Rà soát tính hợp lệ của khoản chi tiêu, đối chiếu hóa đơn và ra quyết định Phê duyệt hoặc Từ chối.';
    actionResultPreview = 'Chuyển sang trạng thái Đã phê duyệt (Approved).';
  } else if (status === 'approved') {
    nextActor = 'Kế toán thanh toán / Thủ quỹ';
    actionGuidance =
      'Khoản chi đã được phê duyệt. Tiến hành chuyển khoản thanh toán hoặc chi tiền mặt cho nhân viên, sau đó bấm Xác nhận chi trả.';
    actionResultPreview = 'Chuyển sang trạng thái Đã chi trả (Reimbursed).';
  } else if (status === 'reimbursed' || status === 'closed') {
    nextActor = 'Đã hoàn tất quy trình';
    actionGuidance =
      'Khoản chi phí đã được thanh toán hoàn tất cho nhân viên. Dữ liệu được ghi nhận vào sổ sách kế toán.';
    actionResultPreview = 'Quy trình kết thúc.';
  } else if (status === 'rejected') {
    nextActor = 'Nhân viên (Người tạo đề nghị)';
    actionGuidance =
      'Đề nghị thanh toán đã bị từ chối. Vui lòng kiểm tra lại lý do hoặc tạo đề nghị mới.';
    actionResultPreview = 'Đề nghị kết thúc ở trạng thái Bị từ chối.';
  }

  const isMutating =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    reimburseMutation.isPending ||
    addItemMutation.isPending;

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) return;
    rejectMutation.mutate(
      { id: claim.id, reason: rejectReason },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setRejectReason('');
          onOpenChange(false);
        },
      }
    );
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(itemForm.amount);
    if (!itemForm.description.trim() || isNaN(amt) || amt <= 0) {
      toast.error('Vui lòng nhập mô tả và số tiền hợp lệ');
      return;
    }
    addItemMutation.mutate({
      claimId: claim.id,
      description: itemForm.description.trim(),
      amount: amt,
      expenseDate: itemForm.expenseDate,
    });
  };

  const heroActions = (
    <div className='flex items-center gap-2'>
      {status === 'draft' && (
        <Button
          size='sm'
          className='h-8 bg-primary text-xs font-medium gap-1.5'
          disabled={isMutating}
          onClick={() =>
            submitMutation.mutate(
              { id: claim.id },
              { onSuccess: () => onOpenChange(false) }
            )
          }
        >
          {submitMutation.isPending && <Icons.spinner className='size-3.5 animate-spin' />}
          <Icons.check className='size-3.5' />
          Nộp đề nghị thanh toán
        </Button>
      )}

      {status === 'submitted' && (
        <>
          <Button
            size='sm'
            className='h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium gap-1.5'
            disabled={isMutating}
            onClick={() =>
              approveMutation.mutate(
                { id: claim.id },
                { onSuccess: () => onOpenChange(false) }
              )
            }
          >
            {approveMutation.isPending && <Icons.spinner className='size-3.5 animate-spin' />}
            <Icons.check className='size-3.5' />
            Phê duyệt chi phí
          </Button>
          <Button
            size='sm'
            variant='destructive'
            className='h-8 text-xs font-medium gap-1.5'
            disabled={isMutating}
            onClick={() => setRejectOpen(true)}
          >
            <Icons.close className='size-3.5' />
            Từ chối
          </Button>
        </>
      )}

      {status === 'approved' && (
        <Button
          size='sm'
          className='h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium gap-1.5'
          disabled={isMutating}
          onClick={() =>
            reimburseMutation.mutate(
              { id: claim.id },
              { onSuccess: () => onOpenChange(false) }
            )
          }
        >
          {reimburseMutation.isPending && <Icons.spinner className='size-3.5 animate-spin' />}
          <Icons.check className='size-3.5' />
          Xác nhận chi trả (Reimburse)
        </Button>
      )}
    </div>
  );

  const totalAmountNum = parseFloat(detail?.totalAmount || claim.totalAmount || '0') || 0;
  const currencyStr = detail?.currency || claim.currency || 'VND';
  const items = detail?.items ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto p-6'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold'>
              Quy trình đề nghị thanh toán (Expense Claim Workflow)
            </DialogTitle>
          </DialogHeader>

          <div className='flex flex-col gap-6 mt-2'>
            {/* Visual Workflow Hero */}
            <GlobalWorkflowHero
              title={claim.title || 'Đề nghị thanh toán chi phí'}
              badge={<StatusBadge mapping={CLAIM_STATUS_MAP} status={status} />}
              subtitle={`Tổng số tiền: ${totalAmountNum.toLocaleString('vi-VN')} ${currencyStr} • Ngày lập: ${claim.createdAt ? formatDateVN(claim.createdAt) : '—'} • Mã đơn: ${claim.id.slice(0, 8)}`}
              steps={EXPENSE_STEPS}
              currentStepIndex={currentStepIndex}
              failedStepIndex={failedStepIndex}
              nextActor={nextActor}
              actionGuidance={actionGuidance}
              actionResultPreview={actionResultPreview}
              actions={heroActions}
            />

            {/* Rejection input prompt */}
            {rejectOpen && (
              <div className='rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3'>
                <div className='flex items-center gap-2'>
                  <Icons.alertCircle className='size-4 text-destructive' />
                  <span className='text-xs font-semibold text-destructive'>
                    Lý do từ chối đề nghị thanh toán:
                  </span>
                </div>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder='Ví dụ: Hóa đơn không hợp lệ, vượt hạn mức chi tiêu dự án...'
                  className='text-xs bg-background h-8'
                />
                <div className='flex justify-end gap-2'>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-7 text-xs'
                    onClick={() => setRejectOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    size='sm'
                    variant='destructive'
                    className='h-7 text-xs'
                    disabled={!rejectReason.trim() || isMutating}
                    onClick={handleRejectConfirm}
                  >
                    Xác nhận từ chối
                  </Button>
                </div>
              </div>
            )}

            {/* Description note */}
            {detail?.description && (
              <div className='rounded-lg border border-border/60 bg-muted/20 p-3'>
                <p className='text-xs font-medium text-foreground mb-1'>Ghi chú / Mục đích chi tiêu:</p>
                <p className='text-xs text-muted-foreground italic'>{detail.description}</p>
              </div>
            )}

            {/* Items table */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-bold text-foreground'>
                  Danh sách các khoản mục chi tiêu ({items.length})
                </h3>
                {status === 'draft' && !addItemOpen && (
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 text-xs gap-1'
                    onClick={() => setAddItemOpen(true)}
                  >
                    <Icons.add className='size-3.5' />
                    Thêm khoản chi
                  </Button>
                )}
              </div>

              {addItemOpen && (
                <form
                  onSubmit={handleAddItem}
                  className='rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-3 text-xs'
                >
                  <div className='font-semibold text-foreground'>Thêm mục chi phí mới</div>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-2.5'>
                    <div>
                      <Label className='text-[11px]'>Mô tả khoản chi</Label>
                      <Input
                        value={itemForm.description}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, description: e.target.value })
                        }
                        placeholder='Ví dụ: Tiếp khách dự án...'
                        className='text-xs h-8 bg-background'
                        required
                      />
                    </div>
                    <div>
                      <Label className='text-[11px]'>Số tiền ({currencyStr})</Label>
                      <Input
                        type='number'
                        value={itemForm.amount}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, amount: e.target.value })
                        }
                        placeholder='Ví dụ: 250000'
                        className='text-xs h-8 bg-background'
                        required
                      />
                    </div>
                    <div>
                      <Label className='text-[11px]'>Ngày phát sinh</Label>
                      <Input
                        type='date'
                        value={itemForm.expenseDate}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, expenseDate: e.target.value })
                        }
                        className='text-xs h-8 bg-background'
                        required
                      />
                    </div>
                  </div>
                  <div className='flex justify-end gap-2'>
                    <Button
                      type='button'
                      size='sm'
                      variant='ghost'
                      className='h-7 text-xs'
                      onClick={() => setAddItemOpen(false)}
                    >
                      Hủy
                    </Button>
                    <Button
                      type='submit'
                      size='sm'
                      className='h-7 text-xs'
                      disabled={addItemMutation.isPending}
                    >
                      {addItemMutation.isPending && (
                        <Icons.spinner className='size-3 animate-spin mr-1' />
                      )}
                      Lưu khoản chi
                    </Button>
                  </div>
                </form>
              )}

              {items.length === 0 ? (
                <p className='text-xs text-muted-foreground border rounded-lg p-4 text-center'>
                  Chưa có khoản mục chi phí nào được khai báo.
                </p>
              ) : (
                <div className='border rounded-lg overflow-hidden'>
                  <table className='w-full text-xs'>
                    <thead className='bg-muted/40 border-b text-muted-foreground'>
                      <tr>
                        <th className='py-2 px-3 text-left font-medium'>Mô tả khoản chi</th>
                        <th className='py-2 px-3 text-right font-medium'>Số tiền ({currencyStr})</th>
                        <th className='py-2 px-3 text-left font-medium'>Ngày phát sinh</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-border/60'>
                      {items.map((item: ExpenseClaimItemRow, idx: number) => {
                        const itemAmt = parseFloat(item.amount || '0') || 0;
                        return (
                          <tr key={item.id || idx}>
                            <td className='py-2 px-3 font-medium text-foreground'>
                              {item.description || '—'}
                            </td>
                            <td className='py-2 px-3 text-right font-mono font-semibold'>
                              {itemAmt.toLocaleString('vi-VN')}
                            </td>
                            <td className='py-2 px-3 text-muted-foreground'>
                              {item.expenseDate ? formatDateVN(item.expenseDate) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
