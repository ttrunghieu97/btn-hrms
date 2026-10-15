'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import { performanceReviewsQueryOptions, performanceCyclesQueryOptions } from '../api/queries';
import { useAssignReviewer, useSubmitPerformanceReview } from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import { REVIEW_STATUS_MAP, type PerformanceReviewRow, type PerformanceCycleRow } from './status-maps';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateVN } from '@/lib/date';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { commonUiCopy, performanceUiCopy } from '@/locales/vi/app-copy';

const copy = performanceUiCopy.reviews;

export function PerformanceReviewsView() {
  const [params, setParams] = useQueryStates({ cycleId: parseAsString });

  const { data: cyclesData } = useQuery(performanceCyclesQueryOptions());
  const cycles = extractList<PerformanceCycleRow>(cyclesData);
  const selectedCycle = params.cycleId || cycles[0]?.id;

  const { data, error, isLoading, refetch } = useQuery({
    ...performanceReviewsQueryOptions(selectedCycle ?? ''),
    enabled: !!selectedCycle,
  });
  const rows = extractList<PerformanceReviewRow>(data);

  const assignMutation = useAssignReviewer();
  const submitReviewMutation = useSubmitPerformanceReview();

  const [assignOpen, setAssignOpen] = React.useState(false);
  const [employeeId, setEmployeeId] = React.useState('');
  const [reviewerId, setReviewerId] = React.useState('');
  const [reviewType, setReviewType] = React.useState<'self' | 'manager' | 'peer'>('self');
  const [dueDate, setDueDate] = React.useState('');

  const [activeReview, setActiveReview] = React.useState<PerformanceReviewRow | null>(null);
  const [overallComment, setOverallComment] = React.useState('');
  const [score, setScore] = React.useState('4');

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCycle || !employeeId.trim() || !reviewerId.trim()) return;
    await assignMutation.mutateAsync({
      cycleId: selectedCycle,
      employeeId: employeeId.trim(),
      reviewerId: reviewerId.trim(),
      reviewType,
      ...(dueDate ? { dueDate } : {}),
    });
    setAssignOpen(false);
    setEmployeeId('');
    setReviewerId('');
    setDueDate('');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReview) return;
    await submitReviewMutation.mutateAsync({
      assignmentId: activeReview.id,
      dto: {
        overallComment: overallComment.trim() || undefined,
        ratings: [
          {
            competencyId: 'general',
            score: Number(score) || 4,
            comment: overallComment.trim() || undefined,
          },
        ],
      },
    });
    setActiveReview(null);
    setOverallComment('');
    setScore('4');
  };

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject={copy.title}
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          {cycles.length > 0 ? (
            <Select
              value={selectedCycle ?? ''}
              onValueChange={(val) => void setParams({ cycleId: val || null })}
            >
              <SelectTrigger className='w-64' aria-label='Chọn chu kỳ đánh giá'>
                <SelectValue placeholder='Chọn chu kỳ đánh giá' />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        {selectedCycle && (
          <Button size='sm' onClick={() => setAssignOpen(true)}>
            <Icons.add className='mr-1.5 h-4 w-4' />
            Phân công đánh giá
          </Button>
        )}
      </div>

      {!selectedCycle ? (
        <AppEmptyState icon={<Icons.page className='size-10' />} title='Chưa có chu kỳ đánh giá' compact />
      ) : rows.length === 0 && !isLoading ? (
        <AppEmptyState icon={<Icons.page className='size-10' />} title={copy.empty} compact />
      ) : (
        <div className='rounded-md border overflow-hidden'>
          {/* Mobile cards view */}
          <div className='flex flex-col gap-3 p-3 md:hidden'>
            {rows.map((row) => (
              <Card key={row.id} className='p-4 space-y-2'>
                <div className='flex items-start justify-between gap-2'>
                  <span className='font-medium text-foreground text-sm'>{row.employeeName ?? '—'}</span>
                  <StatusBadge mapping={REVIEW_STATUS_MAP} status={row.status ?? 'pending'} />
                </div>
                <div className='grid grid-cols-2 gap-2 text-xs text-muted-foreground'>
                  <div>
                    <span className='font-medium text-foreground/80'>{copy.columns.reviewerName}: </span>
                    {row.reviewerName ?? '—'}
                  </div>
                  <div>
                    <span className='font-medium text-foreground/80'>{copy.columns.reviewType}: </span>
                    {row.reviewType ?? '—'}
                  </div>
                  <div className='col-span-2'>
                    <span className='font-medium text-foreground/80'>{copy.columns.dueDate}: </span>
                    {row.dueDate ? formatDateVN(row.dueDate) : '—'}
                  </div>
                </div>
                {row.status !== 'submitted' && (
                  <div className='pt-2 flex justify-end'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        setActiveReview(row);
                        setOverallComment('');
                        setScore('4');
                      }}
                    >
                      {row.reviewType === 'self' ? 'Tự đánh giá' : 'Nộp đánh giá'}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Desktop table view */}
          <div className='hidden md:block overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.columns.employeeName}</TableHead>
                  <TableHead>{copy.columns.reviewerName}</TableHead>
                  <TableHead>{copy.columns.reviewType}</TableHead>
                  <TableHead>{copy.columns.status}</TableHead>
                  <TableHead>{copy.columns.dueDate}</TableHead>
                  <TableHead className='text-right' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>{row.employeeName ?? '—'}</TableCell>
                    <TableCell>{row.reviewerName ?? '—'}</TableCell>
                    <TableCell>{row.reviewType ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge mapping={REVIEW_STATUS_MAP} status={row.status ?? 'pending'} />
                    </TableCell>
                    <TableCell>{row.dueDate ? formatDateVN(row.dueDate) : '—'}</TableCell>
                    <TableCell className='text-right'>
                      {row.status !== 'submitted' && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setActiveReview(row);
                            setOverallComment('');
                            setScore('4');
                          }}
                        >
                          {row.reviewType === 'self' ? 'Tự đánh giá' : 'Nộp đánh giá'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Dialog: Assign Reviewer */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Phân công đánh giá năng lực</DialogTitle>
            <DialogDescription>
              Chỉ định nhân viên tự đánh giá (Self-Review) hoặc người đánh giá cho chu kỳ hiện tại.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignSubmit} className='space-y-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='assign-emp-id'>ID Nhân viên được đánh giá *</Label>
              <Input
                id='assign-emp-id'
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder='Nhập UUID nhân viên...'
                required
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='assign-rev-id'>ID Người đánh giá *</Label>
              <Input
                id='assign-rev-id'
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
                placeholder='Nhập UUID người đánh giá (trùng ID nếu tự đánh giá)...'
                required
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label>Loại đánh giá</Label>
                <Select
                  value={reviewType}
                  onValueChange={(v) => setReviewType(v as 'self' | 'manager' | 'peer')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='self'>Tự đánh giá (Self)</SelectItem>
                    <SelectItem value='manager'>Quản lý (Manager)</SelectItem>
                    <SelectItem value='peer'>Đồng nghiệp (Peer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='assign-due'>Hạn hoàn thành</Label>
                <Input
                  id='assign-due'
                  type='date'
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setAssignOpen(false)}>
                {commonUiCopy.cancel}
              </Button>
              <Button type='submit' isLoading={assignMutation.isPending}>
                Phân công
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Submit Self-Review / Manager Review */}
      <Dialog open={Boolean(activeReview)} onOpenChange={(v) => !v && setActiveReview(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {activeReview?.reviewType === 'self' ? 'Nộp phiếu Tự đánh giá (Self-Review)' : 'Nộp phiếu Đánh giá năng lực'}
            </DialogTitle>
            <DialogDescription>
              Nhân viên: {activeReview?.employeeName ?? activeReview?.employeeId ?? '—'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReviewSubmit} className='space-y-4'>
            <div className='space-y-1.5'>
              <Label>Điểm đánh giá tổng thể (Thang 1 - 5)</Label>
              <Select value={score} onValueChange={setScore}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='5'>5 - Xuất sắc (Vượt kỳ vọng)</SelectItem>
                  <SelectItem value='4'>4 - Tốt (Đạt trên mức yêu cầu)</SelectItem>
                  <SelectItem value='3'>3 - Đạt yêu cầu</SelectItem>
                  <SelectItem value='2'>2 - Cần cải thiện</SelectItem>
                  <SelectItem value='1'>1 - Không đạt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='review-comment'>Nhận xét chi tiết & Kết quả đạt được *</Label>
              <Textarea
                id='review-comment'
                rows={4}
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
                placeholder='Nhập nội dung tự đánh giá / nhận xét...'
                required
              />
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setActiveReview(null)}>
                {commonUiCopy.cancel}
              </Button>
              <Button type='submit' isLoading={submitReviewMutation.isPending}>
                Gửi phiếu đánh giá
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
