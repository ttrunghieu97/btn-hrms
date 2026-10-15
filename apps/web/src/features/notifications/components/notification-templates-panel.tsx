'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getPlatformNotificationsControllerListTemplatesQueryKey,
  usePlatformNotificationsControllerCreateTemplate,
  usePlatformNotificationsControllerListTemplates,
  usePlatformNotificationsControllerUpdateTemplate,
} from '@/api/generated/platform-notifications/platform-notifications';
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

type NotificationChannelType = 'email' | 'sms' | 'push' | 'in_app';

interface NotificationTemplateItem {
  id: string;
  name: string;
  type: NotificationChannelType | string;
  subject?: string | null;
  body: string;
  updatedAt?: string;
}

function extractTemplates(raw: unknown): NotificationTemplateItem[] {
  if (!raw || typeof raw !== 'object') return [];
  const envelope = raw as Record<string, unknown>;
  const inner = envelope.data !== undefined ? envelope.data : envelope;
  if (Array.isArray(inner)) return inner as NotificationTemplateItem[];
  if (inner && typeof inner === 'object') {
    const obj = inner as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as NotificationTemplateItem[];
    if (Array.isArray(obj.data)) return obj.data as NotificationTemplateItem[];
  }
  return [];
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
  in_app: 'In-App',
};

export function NotificationTemplatesPanel() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<NotificationTemplateItem | null>(
    null
  );

  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<NotificationChannelType>('in_app');
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');

  const templatesQuery = usePlatformNotificationsControllerListTemplates();
  const templates = React.useMemo(
    () => extractTemplates(templatesQuery.data),
    [templatesQuery.data]
  );

  const invalidateTemplates = () => {
    void queryClient.invalidateQueries({
      queryKey: getPlatformNotificationsControllerListTemplatesQueryKey(),
    });
  };

  const createMutation = usePlatformNotificationsControllerCreateTemplate({
    mutation: {
      onSuccess: () => {
        toast.success('Đã tạo mẫu thông báo mới');
        setDialogOpen(false);
        invalidateTemplates();
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Không thể tạo mẫu thông báo');
      },
    },
  });

  const updateMutation = usePlatformNotificationsControllerUpdateTemplate({
    mutation: {
      onSuccess: () => {
        toast.success('Đã cập nhật mẫu thông báo');
        setDialogOpen(false);
        setEditingTemplate(null);
        invalidateTemplates();
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Không thể cập nhật mẫu thông báo');
      },
    },
  });

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setName('');
    setType('in_app');
    setSubject('');
    setBody('');
    setDialogOpen(true);
  };

  const openEditDialog = (item: NotificationTemplateItem) => {
    setEditingTemplate(item);
    setName(item.name);
    setType((item.type as NotificationChannelType) || 'in_app');
    setSubject(item.subject ?? '');
    setBody(item.body);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) {
      toast.error('Vui lòng nhập tên mẫu và nội dung thông báo');
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      subject: subject.trim() || undefined,
      body: body.trim(),
    };

    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        data: payload,
      });
    } else {
      createMutation.mutate({
        data: payload,
      });
    }
  };

  return (
    <Card>
      <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <CardTitle>Mẫu thông báo hệ thống (Notification Templates)</CardTitle>
          <CardDescription>
            Quản lý các mẫu nội dung thông báo tự động gửi qua Email, SMS, Push và In-App.
          </CardDescription>
        </div>
        <Button size='sm' onClick={openCreateDialog}>
          <Icons.add className='mr-2 h-4 w-4' />
          Tạo mẫu thông báo
        </Button>
      </CardHeader>
      <CardContent>
        {templatesQuery.isLoading ? (
          <div className='text-muted-foreground py-12 text-center text-sm'>
            Đang tải danh sách mẫu thông báo...
          </div>
        ) : templates.length === 0 ? (
          <div className='text-muted-foreground py-12 text-center text-sm'>
            Chưa có mẫu thông báo nào. Nhấn &ldquo;Tạo mẫu thông báo&rdquo; để thêm mới.
          </div>
        ) : (
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã / Tên mẫu</TableHead>
                  <TableHead>Kênh gửi</TableHead>
                  <TableHead>Tiêu đề (Subject)</TableHead>
                  <TableHead>Nội dung mẫu (Body)</TableHead>
                  <TableHead className='text-right'>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell className='font-mono font-medium'>{tpl.name}</TableCell>
                    <TableCell>
                      <Badge variant='outline'>
                        {CHANNEL_LABELS[tpl.type] ?? tpl.type}
                      </Badge>
                    </TableCell>
                    <TableCell className='max-w-xs truncate text-sm'>
                      {tpl.subject || '—'}
                    </TableCell>
                    <TableCell className='text-muted-foreground max-w-md truncate text-sm'>
                      {tpl.body}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => openEditDialog(tpl)}
                      >
                        Chỉnh sửa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Chỉnh sửa mẫu thông báo' : 'Tạo mẫu thông báo mới'}
            </DialogTitle>
            <DialogDescription>
              Hỗ trợ biến động dạng <code className='font-mono'>{'{{employeeName}}'}</code> trong tiêu đề và nội dung.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='nt-name'>Mã / Tên mẫu</Label>
                <Input
                  id='nt-name'
                  placeholder='VD: LEAVE_APPROVED_EMAIL'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label>Kênh gửi</Label>
                <Select
                  value={type}
                  onValueChange={(val) => setType(val as NotificationChannelType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Chọn kênh' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='in_app'>In-App (Trong ứng dụng)</SelectItem>
                    <SelectItem value='email'>Email</SelectItem>
                    <SelectItem value='push'>Push Notification</SelectItem>
                    <SelectItem value='sms'>SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='nt-subject'>Tiêu đề thông báo (Subject)</Label>
              <Input
                id='nt-subject'
                placeholder='VD: Đơn xin nghỉ phép của bạn đã được phê duyệt'
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='nt-body'>Nội dung mẫu (Body)</Label>
              <Textarea
                id='nt-body'
                rows={4}
                placeholder='Xin chào {{employeeName}}, đơn nghỉ phép từ ngày {{startDate}} của bạn đã được duyệt.'
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
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
