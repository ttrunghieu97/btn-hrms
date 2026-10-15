'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { onboardingTemplatesQueryOptions } from '../api/queries';
import {
  useCreateOnboardingTemplate,
  useUpdateOnboardingTemplate,
  useDeleteOnboardingTemplate,
} from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import type { OnboardingTemplateRow } from './status-maps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateVN } from '@/lib/date';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { commonUiCopy, onboardingUiCopy } from '@/locales/vi/app-copy';

const copy = onboardingUiCopy.templates;

interface ChecklistDraftItem {
  title: string;
  assigneeType: string;
  dueDaysOffset: number;
}

const DEFAULT_CHECKLIST_ITEM: ChecklistDraftItem = {
  title: 'Bàn giao thiết bị & tài khoản hệ thống',
  assigneeType: 'it',
  dueDaysOffset: 1,
};

export function OnboardingTemplatesView() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'onboarding' | 'offboarding'>('onboarding');
  const [items, setItems] = useState<ChecklistDraftItem[]>([DEFAULT_CHECKLIST_ITEM]);

  const { data, error, isLoading, refetch } = useQuery(onboardingTemplatesQueryOptions());
  const rows = extractList<OnboardingTemplateRow>(data);
  const createTemplate = useCreateOnboardingTemplate();
  const updateTemplate = useUpdateOnboardingTemplate();
  const deleteTemplate = useDeleteOnboardingTemplate();

  function openCreateDialog() {
    setEditingId(null);
    setName('');
    setType('onboarding');
    setItems([{ ...DEFAULT_CHECKLIST_ITEM }]);
    setOpen(true);
  }

  function openEditDialog(row: OnboardingTemplateRow) {
    setEditingId(row.id);
    setName(row.name ?? '');
    setType((row.type as 'onboarding' | 'offboarding') ?? 'onboarding');
    setItems([{ ...DEFAULT_CHECKLIST_ITEM }]);
    setOpen(true);
  }

  function addChecklistItem() {
    setItems((prev) => [
      ...prev,
      { title: '', assigneeType: 'hr', dueDaysOffset: 3 },
    ]);
  }

  function removeChecklistItem(index: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  function updateChecklistItem(
    index: number,
    patch: Partial<ChecklistDraftItem>,
  ) {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    );
  }

  async function handleSave() {
    if (!name.trim()) return;
    const validItems = items
      .filter((item) => item.title.trim().length > 0)
      .map((item) => ({
        title: item.title.trim(),
        assigneeType: item.assigneeType,
        dueDaysOffset: Number(item.dueDaysOffset) || 0,
        isMandatory: true,
      }));

    if (editingId) {
      await updateTemplate.mutateAsync({
        id: editingId,
        dto: {
          name: name.trim(),
          type,
          ...(validItems.length > 0 ? { items: validItems } : {}),
        },
      });
    } else {
      await createTemplate.mutateAsync({
        name: name.trim(),
        type,
        items:
          validItems.length > 0
            ? validItems
            : [{ ...DEFAULT_CHECKLIST_ITEM, isMandatory: true }],
      });
    }
    setOpen(false);
    setEditingId(null);
    setName('');
  }

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

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{copy.title}</h2>
        <Button size='sm' onClick={openCreateDialog}>
          <Icons.add className='mr-1.5 h-4 w-4' />
          {copy.create}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-lg max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Chỉnh sửa mẫu quy trình' : copy.create}
            </DialogTitle>
            <DialogDescription>{onboardingUiCopy.description}</DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-3'>
            <div className='grid gap-2'>
              <Label htmlFor='tpl-name'>{commonUiCopy.name} *</Label>
              <Input
                id='tpl-name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Tên mẫu onboarding / offboarding'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='tpl-type'>{copy.columns.type}</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as 'onboarding' | 'offboarding')}
              >
                <SelectTrigger id='tpl-type'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='onboarding'>Hội nhập (Onboarding)</SelectItem>
                  <SelectItem value='offboarding'>Thôi việc (Offboarding)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2.5'>
              <div className='flex items-center justify-between'>
                <Label>Danh mục công việc (Checklist)</Label>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={addChecklistItem}
                >
                  <Icons.add className='mr-1 h-3.5 w-3.5' />
                  Thêm hạng mục
                </Button>
              </div>

              <div className='space-y-2'>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className='grid grid-cols-12 gap-2 items-center rounded-md border p-2'
                  >
                    <div className='col-span-6'>
                      <Input
                        value={item.title}
                        onChange={(e) =>
                          updateChecklistItem(idx, { title: e.target.value })
                        }
                        placeholder='Tên đầu việc...'
                        className='h-8 text-xs'
                      />
                    </div>
                    <div className='col-span-3'>
                      <Select
                        value={item.assigneeType}
                        onValueChange={(val) =>
                          updateChecklistItem(idx, { assigneeType: val })
                        }
                      >
                        <SelectTrigger className='h-8 text-xs'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='hr'>Nhân sự (HR)</SelectItem>
                          <SelectItem value='it'>CNTT (IT)</SelectItem>
                          <SelectItem value='manager'>Quản lý</SelectItem>
                          <SelectItem value='employee'>Nhân viên</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='col-span-2'>
                      <Input
                        type='number'
                        min={0}
                        max={365}
                        value={item.dueDaysOffset}
                        onChange={(e) =>
                          updateChecklistItem(idx, {
                            dueDaysOffset: Number(e.target.value),
                          })
                        }
                        title='Số ngày hạn hoàn thành'
                        className='h-8 text-xs'
                      />
                    </div>
                    <div className='col-span-1 flex justify-end'>
                      {items.length > 1 && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7 text-destructive'
                          onClick={() => removeChecklistItem(idx)}
                        >
                          <Icons.trash className='h-3.5 w-3.5' />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              {commonUiCopy.cancel}
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {editingId ? commonUiCopy.saveChanges : commonUiCopy.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <TableHead>{commonUiCopy.name}</TableHead>
                <TableHead>{copy.columns.type}</TableHead>
                <TableHead>{copy.columns.itemCount}</TableHead>
                <TableHead>{commonUiCopy.date}</TableHead>
                <TableHead className='text-right' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant='outline'>
                      {row.type === 'offboarding' ? 'Thôi việc' : 'Hội nhập'}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.itemCount ?? 0}</TableCell>
                  <TableCell>
                    {row.createdAt ? formatDateVN(row.createdAt) : '—'}
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex items-center justify-end gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => openEditDialog(row)}
                      >
                        Chỉnh sửa
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => deleteTemplate.mutate({ id: row.id })}
                        disabled={deleteTemplate.isPending}
                      >
                        {commonUiCopy.delete}
                      </Button>
                    </div>
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
