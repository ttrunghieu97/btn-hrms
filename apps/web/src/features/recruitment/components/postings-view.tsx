'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { postingsQueryOptions, requisitionsQueryOptions } from '../api/queries';
import {
  usePublishPosting,
  useUpdatePosting,
  useChangePostingStatus,
} from '../api/mutations';
import type { PostingListFilters } from '../queries/recruitment-queries';
import { extractList } from '@/lib/api-extract';
import { POSTING_STATUS_MAP, type PostingRow, type RequisitionRow } from './status-maps';
import type { ChangePostingStatusDtoStatus } from '@/api/generated/model';
import {
  notifyMutationError,
  notifyMutationSuccess,
} from '@/lib/mutation-feedback';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateVN } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { commonUiCopy, recruitmentUiCopy } from '@/lib/app-copy';

const copy = recruitmentUiCopy.postings;

export function PostingsView() {
  const filters: PostingListFilters = { page: 1, limit: 20 };
  const { data, error, isLoading, refetch } = useQuery(
    postingsQueryOptions(filters),
  );
  const rows = extractList<PostingRow>(data);

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
      <div className='flex items-center justify-end gap-4'>
        <PublishPostingDialog />
      </div>

      {rows.length === 0 && !isLoading ? (
        <AppEmptyState
          icon={<Icons.page className='size-10' />}
          title={copy.empty}
          compact
        />
      ) : (
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.columns.title}</TableHead>
                <TableHead>{copy.columns.status}</TableHead>
                <TableHead>{copy.columns.openedAt}</TableHead>
                <TableHead>{copy.columns.closesAt}</TableHead>
                <TableHead className='text-right'>
                  {commonUiCopy.actionsMenu}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.title ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={row.status ?? ''}
                      mapping={POSTING_STATUS_MAP}
                    />
                  </TableCell>
                  <TableCell>{row.openedAt ? formatDateVN(row.openedAt) : '—'}</TableCell>
                  <TableCell>{row.closesAt ? formatDateVN(row.closesAt) : '—'}</TableCell>
                  <TableCell className='text-right'>
                    <PostingRowActions row={row} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function PostingRowActions({ row }: { row: PostingRow }) {
  const changeStatus = useChangePostingStatus();
  const updatePosting = useUpdatePosting();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: row.title ?? '',
    description: (row as { description?: string }).description ?? '',
    requirements: (row as { requirements?: string }).requirements ?? '',
    closesAt: row.closesAt ? row.closesAt.slice(0, 10) : '',
  });

  const onSaveEdit = async () => {
    try {
      await updatePosting.mutateAsync({
        id: row.id,
        dto: {
          title: editForm.title.trim(),
          ...(editForm.description ? { description: editForm.description } : {}),
          ...(editForm.requirements
            ? { requirements: editForm.requirements }
            : {}),
          ...(editForm.closesAt ? { closesAt: editForm.closesAt } : {}),
        },
      });
      notifyMutationSuccess(commonUiCopy.saveChanges);
      setEditOpen(false);
    } catch (err) {
      notifyMutationError(err, commonUiCopy.saveChanges);
    }
  };

  const setStatus = async (status: ChangePostingStatusDtoStatus, label: string) => {
    try {
      await changeStatus.mutateAsync({ id: row.id, dto: { status } });
      notifyMutationSuccess(label);
    } catch (err) {
      notifyMutationError(err, label);
    }
  };

  if (row.status === 'closed') return <span className='text-muted-foreground'>—</span>;

  return (
    <div className='flex justify-end gap-2'>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant='outline' size='sm'>
            Chỉnh sửa
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa tin tuyển dụng</DialogTitle>
            <DialogDescription>{row.title}</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-2'>
            <div className='grid gap-2'>
              <Label htmlFor={`edit-post-title-${row.id}`}>
                {copy.columns.title}
              </Label>
              <Input
                id={`edit-post-title-${row.id}`}
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor={`edit-post-desc-${row.id}`}>
                {copy.fields.description}
              </Label>
              <Textarea
                id={`edit-post-desc-${row.id}`}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor={`edit-post-req-${row.id}`}>
                {copy.fields.requirements}
              </Label>
              <Textarea
                id={`edit-post-req-${row.id}`}
                value={editForm.requirements}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, requirements: e.target.value }))
                }
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor={`edit-post-closes-${row.id}`}>
                {copy.columns.closesAt}
              </Label>
              <Input
                id={`edit-post-closes-${row.id}`}
                type='date'
                value={editForm.closesAt}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, closesAt: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditOpen(false)}>
              {commonUiCopy.cancel}
            </Button>
            <Button
              onClick={() => void onSaveEdit()}
              disabled={updatePosting.isPending}
            >
              {commonUiCopy.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {row.status === 'open' ? (
        <Button
          variant='outline'
          size='sm'
          disabled={changeStatus.isPending}
          onClick={() => void setStatus('paused', copy.actions.pause)}
        >
          {copy.actions.pause}
        </Button>
      ) : null}
      {row.status === 'paused' ? (
        <Button
          variant='outline'
          size='sm'
          disabled={changeStatus.isPending}
          onClick={() => void setStatus('open', copy.actions.resume)}
        >
          {copy.actions.resume}
        </Button>
      ) : null}
      <Button
        variant='ghost'
        size='sm'
        disabled={changeStatus.isPending}
        onClick={() => void setStatus('closed', copy.actions.close)}
      >
        {copy.actions.close}
      </Button>
    </div>
  );
}

function PublishPostingDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    requisitionId: '',
    title: '',
    description: '',
    requirements: '',
    closesAt: '',
  });
  const { data: reqData } = useQuery(
    requisitionsQueryOptions({ page: 1, limit: 100 }),
  );
  const requisitions = extractList<RequisitionRow>(reqData);
  const publish = usePublishPosting();

  const onPublish = async () => {
    try {
      await publish.mutateAsync({
        requisitionId: form.requisitionId.trim(),
        title: form.title.trim(),
        ...(form.description ? { description: form.description } : {}),
        ...(form.requirements ? { requirements: form.requirements } : {}),
        ...(form.closesAt ? { closesAt: form.closesAt } : {}),
      });
      notifyMutationSuccess(copy.actions.publish);
      setOpen(false);
      setForm({
        requisitionId: '',
        title: '',
        description: '',
        requirements: '',
        closesAt: '',
      });
    } catch (err) {
      notifyMutationError(err, copy.actions.publish);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm'>
          <Icons.plusCircle className='mr-2 size-4' />
          {copy.actions.publish}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.actions.publish}</DialogTitle>
          <DialogDescription>{copy.columns.requisition}</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-2'>
          <div className='grid gap-2'>
            <Label htmlFor='post-req'>{copy.columns.requisition}</Label>
            {requisitions.length > 0 ? (
              <Select
                value={form.requisitionId}
                onValueChange={(value) => {
                  const selected = requisitions.find((r) => r.id === value);
                  setForm((f) => ({
                    ...f,
                    requisitionId: value,
                    title: f.title || selected?.title || '',
                  }));
                }}
              >
                <SelectTrigger id='post-req'>
                  <SelectValue placeholder='Chọn yêu cầu tuyển dụng...' />
                </SelectTrigger>
                <SelectContent>
                  {requisitions.map((req) => (
                    <SelectItem key={req.id} value={req.id}>
                      {req.title ?? req.id.slice(0, 8)} ({req.headcount ?? 1} vị trí)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id='post-req'
                value={form.requisitionId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, requisitionId: e.target.value }))
                }
                placeholder={copy.placeholders.requisitionUuid}
              />
            )}
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='post-title'>{copy.columns.title}</Label>
            <Input
              id='post-title'
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='post-desc'>{copy.fields.description}</Label>
            <Textarea
              id='post-desc'
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='post-req-text'>{copy.fields.requirements}</Label>
            <Textarea
              id='post-req-text'
              value={form.requirements}
              onChange={(e) =>
                setForm((f) => ({ ...f, requirements: e.target.value }))
              }
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='post-closes'>{copy.columns.closesAt}</Label>
            <Input
              id='post-closes'
              type='date'
              value={form.closesAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, closesAt: e.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            {commonUiCopy.cancel}
          </Button>
          <Button
            onClick={() => void onPublish()}
            disabled={publish.isPending || !form.requisitionId || !form.title}
          >
            {copy.actions.publish}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
