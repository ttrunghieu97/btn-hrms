'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getTaskTemplatesControllerFindAllQueryKey,
  useTaskTemplatesControllerCreate,
  useTaskTemplatesControllerFindAll,
  useTaskTemplatesControllerInstantiate,
  useTaskTemplatesControllerRemove,
  useTaskTemplatesControllerUpdate,
} from '@/api/generated/task-templates/task-templates';
import { getTasksControllerListQueryKey } from '@/api/generated/tasks/tasks';
import { taskKeys } from '../queries/task-queries';
import type { CreateTaskTemplateDtoPriority } from '@/api/generated/model/createTaskTemplateDtoPriority';
import type { UpdateTaskTemplateDtoPriority } from '@/api/generated/model/updateTaskTemplateDtoPriority';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';

interface ChecklistEntry {
  title?: string;
  completed?: boolean;
  [key: string]: unknown;
}

interface TaskTemplateItem {
  id: string;
  title: string;
  description?: string | null;
  priority?: CreateTaskTemplateDtoPriority | string;
  defaultAssigneeId?: string | null;
  departmentId?: string | null;
  checklist?: ChecklistEntry[];
  createdAt?: string;
  updatedAt?: string;
}

function extractTemplates(raw: unknown): TaskTemplateItem[] {
  if (!raw || typeof raw !== 'object') return [];
  const envelope = raw as Record<string, unknown>;
  const inner = envelope.data !== undefined ? envelope.data : envelope;
  if (Array.isArray(inner)) return inner as TaskTemplateItem[];
  if (inner && typeof inner === 'object') {
    const obj = inner as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as TaskTemplateItem[];
    if (Array.isArray(obj.data)) return obj.data as TaskTemplateItem[];
  }
  return [];
}

const PRIORITY_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  low: { label: 'Thấp', variant: 'outline' },
  medium: { label: 'Trung bình', variant: 'secondary' },
  high: { label: 'Cao', variant: 'default' },
  urgent: { label: 'Khẩn cấp', variant: 'destructive' },
};

export function TaskTemplatesView() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<TaskTemplateItem | null>(null);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState<CreateTaskTemplateDtoPriority>('medium');
  const [checklistText, setChecklistText] = React.useState('');

  const templatesQuery = useTaskTemplatesControllerFindAll();
  const templates = React.useMemo(
    () => extractTemplates(templatesQuery.data),
    [templatesQuery.data]
  );

  const invalidateTemplates = () => {
    void queryClient.invalidateQueries({
      queryKey: getTaskTemplatesControllerFindAllQueryKey(),
    });
    void queryClient.invalidateQueries({
      queryKey: taskKeys.templates(),
    });
  };

  const createMutation = useTaskTemplatesControllerCreate({
    mutation: {
      onSuccess: () => {
        toast.success('Đã tạo mẫu công việc mới');
        setDialogOpen(false);
        invalidateTemplates();
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Không thể tạo mẫu công việc');
      },
    },
  });

  const updateMutation = useTaskTemplatesControllerUpdate({
    mutation: {
      onSuccess: () => {
        toast.success('Đã cập nhật mẫu công việc');
        setDialogOpen(false);
        setEditingTemplate(null);
        invalidateTemplates();
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Không thể cập nhật mẫu công việc');
      },
    },
  });

  const removeMutation = useTaskTemplatesControllerRemove({
    mutation: {
      onSuccess: () => {
        toast.success('Đã xóa mẫu công việc');
        invalidateTemplates();
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Không thể xóa mẫu công việc');
      },
    },
  });

  const instantiateMutation = useTaskTemplatesControllerInstantiate({
    mutation: {
      onSuccess: () => {
        toast.success('Đã khởi tạo công việc mới từ mẫu');
        void queryClient.invalidateQueries({
          queryKey: getTasksControllerListQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: taskKeys.lists(),
        });
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Không thể khởi tạo công việc từ mẫu');
      },
    },
  });

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setChecklistText('');
    setDialogOpen(true);
  };

  const openEditDialog = (item: TaskTemplateItem) => {
    setEditingTemplate(item);
    setTitle(item.title);
    setDescription(item.description ?? '');
    const normalizedPriority = (item.priority?.toLowerCase() ?? 'medium') as CreateTaskTemplateDtoPriority;
    setPriority(normalizedPriority);
    const lines = Array.isArray(item.checklist)
      ? item.checklist
          .map((c) => (typeof c.title === 'string' ? c.title : ''))
          .filter(Boolean)
          .join('\n')
      : '';
    setChecklistText(lines);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề mẫu công việc');
      return;
    }

    const checklist = checklistText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((itemTitle) => ({ title: itemTitle, completed: false }));

    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          priority: priority as UpdateTaskTemplateDtoPriority,
          checklist,
        },
      });
    } else {
      createMutation.mutate({
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          checklist,
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <CardTitle>Quản lý Mẫu công việc (Task Templates)</CardTitle>
          <CardDescription>
            Thiết lập các mẫu công việc định kỳ và danh sách kiểm tra (checklist) để tạo nhanh công việc chuẩn hóa.
          </CardDescription>
        </div>
        <Button size='sm' onClick={openCreateDialog}>
          <Icons.add className='mr-2 h-4 w-4' />
          Thêm mẫu công việc
        </Button>
      </CardHeader>
      <CardContent>
        {templatesQuery.isLoading ? (
          <div className='text-muted-foreground py-12 text-center text-sm'>
            Đang tải danh sách mẫu công việc...
          </div>
        ) : templates.length === 0 ? (
          <div className='text-muted-foreground py-12 text-center text-sm'>
            Chưa có mẫu công việc nào. Nhấn &ldquo;Thêm mẫu công việc&rdquo; để tạo mới.
          </div>
        ) : (
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề mẫu</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Độ ưu tiên</TableHead>
                  <TableHead>Checklist</TableHead>
                  <TableHead className='text-right'>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => {
                  const prioKey = (tpl.priority ?? 'medium').toLowerCase();
                  const prioMeta = PRIORITY_LABELS[prioKey] ?? {
                    label: String(tpl.priority ?? 'Trung bình'),
                    variant: 'outline' as const,
                  };
                  const checklistCount = Array.isArray(tpl.checklist) ? tpl.checklist.length : 0;

                  return (
                    <TableRow key={tpl.id}>
                      <TableCell className='font-medium'>{tpl.title}</TableCell>
                      <TableCell className='text-muted-foreground max-w-xs truncate text-sm'>
                        {tpl.description || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={prioMeta.variant}>{prioMeta.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{checklistCount} mục</Badge>
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          <Button
                            variant='secondary'
                            size='sm'
                            disabled={instantiateMutation.isPending}
                            onClick={() => instantiateMutation.mutate({ id: tpl.id })}
                          >
                            Khởi tạo việc
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => openEditDialog(tpl)}
                          >
                            Sửa
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            disabled={removeMutation.isPending}
                            onClick={() => removeMutation.mutate({ id: tpl.id })}
                          >
                            Xóa
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Cập nhật mẫu công việc' : 'Tạo mẫu công việc mới'}
            </DialogTitle>
            <DialogDescription>
              Định nghĩa thông tin mẫu và các bước kiểm tra mặc định khi khởi tạo công việc.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='tpl-title'>Tiêu đề mẫu công việc</Label>
              <Input
                id='tpl-title'
                placeholder='VD: Chuẩn bị hồ sơ thuế TNCN hàng tháng'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='tpl-desc'>Mô tả chi tiết</Label>
              <Textarea
                id='tpl-desc'
                rows={3}
                placeholder='Hướng dẫn thực hiện công việc...'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>Độ ưu tiên mặc định</Label>
              <Select
                value={priority}
                onValueChange={(val) => setPriority(val as CreateTaskTemplateDtoPriority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Chọn độ ưu tiên' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='low'>Thấp (Low)</SelectItem>
                  <SelectItem value='medium'>Trung bình (Medium)</SelectItem>
                  <SelectItem value='high'>Cao (High)</SelectItem>
                  <SelectItem value='urgent'>Khẩn cấp (Urgent)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='tpl-checklist'>Danh sách việc cần làm (Mỗi dòng 1 mục)</Label>
              <Textarea
                id='tpl-checklist'
                rows={4}
                placeholder={'Tổng hợp bảng chấm công\nĐối chiếu danh sách giảm trừ gia cảnh\nXuất tờ khai khấu trừ thuế'}
                value={checklistText}
                onChange={(e) => setChecklistText(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button
                type='submit'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingTemplate ? 'Lưu thay đổi' : 'Tạo mẫu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
