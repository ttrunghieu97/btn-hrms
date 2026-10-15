'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getWebhookSubscriptionsControllerListQueryKey,
  useWebhookSubscriptionsControllerCreate,
  useWebhookSubscriptionsControllerList,
  useWebhookSubscriptionsControllerRemove,
  useWebhookSubscriptionsControllerUpdate,
} from '@/api/generated/integration-hub/integration-hub';
import type { CreateWebhookSubscriptionDtoStatus } from '@/api/generated/model/createWebhookSubscriptionDtoStatus';
import type { UpdateWebhookSubscriptionDtoStatus } from '@/api/generated/model/updateWebhookSubscriptionDtoStatus';
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
import { Icons } from '@/components/icons';

export interface WebhookSubscriptionItem {
  id: string;
  eventType: string;
  targetUrl: string;
  status: 'active' | 'disabled' | string;
  createdAt?: string;
  updatedAt?: string;
}

export function extractWebhookSubscriptions(raw: unknown): WebhookSubscriptionItem[] {
  if (!raw || typeof raw !== 'object') return [];
  const envelope = raw as Record<string, unknown>;
  const inner = envelope.data !== undefined ? envelope.data : envelope;
  if (Array.isArray(inner)) return inner as WebhookSubscriptionItem[];
  if (inner && typeof inner === 'object') {
    const obj = inner as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as WebhookSubscriptionItem[];
    if (Array.isArray(obj.data)) return obj.data as WebhookSubscriptionItem[];
  }
  return [];
}

const EVENT_TYPE_SUGGESTIONS = [
  'employee.created',
  'employee.updated',
  'employee.terminated',
  'leave.approved',
  'payroll.finalized',
  'attendance.anomaly_detected',
];

export function WebhookSubscriptionsSection() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<WebhookSubscriptionItem | null>(null);

  const [eventType, setEventType] = React.useState('employee.created');
  const [targetUrl, setTargetUrl] = React.useState('');
  const [secret, setSecret] = React.useState('');
  const [status, setStatus] = React.useState<CreateWebhookSubscriptionDtoStatus>('active');

  const listQuery = useWebhookSubscriptionsControllerList();
  const subscriptions = React.useMemo(
    () => extractWebhookSubscriptions(listQuery.data),
    [listQuery.data]
  );

  const invalidateList = () => {
    void queryClient.invalidateQueries({
      queryKey: getWebhookSubscriptionsControllerListQueryKey(),
    });
  };

  const createMutation = useWebhookSubscriptionsControllerCreate({
    mutation: {
      onSuccess: () => {
        toast.success('Đã đăng ký Webhook mới thành công');
        setDialogOpen(false);
        invalidateList();
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Không thể tạo Webhook');
      },
    },
  });

  const updateMutation = useWebhookSubscriptionsControllerUpdate({
    mutation: {
      onSuccess: () => {
        toast.success('Đã cập nhật cấu hình Webhook');
        setDialogOpen(false);
        setEditingItem(null);
        invalidateList();
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Không thể cập nhật Webhook');
      },
    },
  });

  const removeMutation = useWebhookSubscriptionsControllerRemove({
    mutation: {
      onSuccess: () => {
        toast.success('Đã xóa đăng ký Webhook');
        invalidateList();
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Không thể xóa Webhook');
      },
    },
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setEventType('employee.created');
    setTargetUrl('');
    setSecret('');
    setStatus('active');
    setDialogOpen(true);
  };

  const openEditDialog = (item: WebhookSubscriptionItem) => {
    setEditingItem(item);
    setEventType(item.eventType);
    setTargetUrl(item.targetUrl);
    setSecret('');
    setStatus((item.status === 'disabled' ? 'disabled' : 'active') as CreateWebhookSubscriptionDtoStatus);
    setDialogOpen(true);
  };

  const handleToggleStatus = (item: WebhookSubscriptionItem) => {
    const nextStatus: UpdateWebhookSubscriptionDtoStatus =
      item.status === 'active' ? 'disabled' : 'active';
    updateMutation.mutate({
      id: item.id,
      data: { status: nextStatus },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) {
      toast.error('Vui lòng nhập URL nhận dữ liệu (Target URL)');
      return;
    }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: {
          targetUrl: targetUrl.trim(),
          secret: secret.trim() || undefined,
          status: status as UpdateWebhookSubscriptionDtoStatus,
        },
      });
    } else {
      if (!eventType.trim() || !secret.trim()) {
        toast.error('Vui lòng nhập sự kiện và khóa bí mật (Signing Secret)');
        return;
      }
      createMutation.mutate({
        data: {
          eventType: eventType.trim(),
          targetUrl: targetUrl.trim(),
          secret: secret.trim(),
          status,
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <CardTitle>Đăng ký Webhook (Outbound Webhooks)</CardTitle>
          <CardDescription>
            Quản lý các điểm cuối HTTP nhận sự kiện thời gian thực từ hệ thống HRMS (HMAC-SHA256).
          </CardDescription>
        </div>
        <Button size='sm' onClick={openCreateDialog}>
          <Icons.add className='mr-2 h-4 w-4' />
          Thêm Webhook
        </Button>
      </CardHeader>
      <CardContent>
        {listQuery.isLoading ? (
          <div className='text-muted-foreground py-10 text-center text-sm'>
            Đang tải danh sách Webhook...
          </div>
        ) : subscriptions.length === 0 ? (
          <div className='text-muted-foreground py-10 text-center text-sm'>
            Chưa có Webhook nào được cấu hình. Nhấn &ldquo;Thêm Webhook&rdquo; để đăng ký nhận sự kiện.
          </div>
        ) : (
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sự kiện (Event Type)</TableHead>
                  <TableHead>Endpoint nhận (Target URL)</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead className='text-right'>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className='font-mono text-xs font-medium'>
                      {sub.eventType}
                    </TableCell>
                    <TableCell className='max-w-xs truncate font-mono text-xs'>
                      {sub.targetUrl}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                        {sub.status === 'active' ? 'Đang hoạt động' : 'Tạm ngưng'}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-muted-foreground text-xs'>
                      {sub.updatedAt
                        ? new Date(sub.updatedAt).toLocaleString('vi-VN')
                        : sub.createdAt
                          ? new Date(sub.createdAt).toLocaleString('vi-VN')
                          : '—'}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={updateMutation.isPending}
                          onClick={() => handleToggleStatus(sub)}
                        >
                          {sub.status === 'active' ? 'Tạm ngưng' : 'Kích hoạt'}
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => openEditDialog(sub)}
                        >
                          Sửa
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          disabled={removeMutation.isPending}
                          onClick={() => removeMutation.mutate({ id: sub.id })}
                        >
                          Xóa
                        </Button>
                      </div>
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
              {editingItem ? 'Cập nhật Webhook' : 'Đăng ký Webhook mới'}
            </DialogTitle>
            <DialogDescription>
              Hệ thống sẽ gửi HTTP POST kèm chữ ký bảo mật tới URL đích khi sự kiện phát sinh.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='wh-event'>Loại sự kiện (Event Type)</Label>
              <Input
                id='wh-event'
                list='wh-event-suggestions'
                placeholder='VD: employee.created, leave.approved...'
                value={eventType}
                disabled={Boolean(editingItem)}
                onChange={(e) => setEventType(e.target.value)}
                required
              />
              <datalist id='wh-event-suggestions'>
                {EVENT_TYPE_SUGGESTIONS.map((ev) => (
                  <option key={ev} value={ev} />
                ))}
              </datalist>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='wh-url'>Target URL (HTTPS Endpoint)</Label>
              <Input
                id='wh-url'
                type='url'
                placeholder='https://erp.company.vn/webhooks/hrms'
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='wh-secret'>
                Khóa bí mật ký gói tin (Signing Secret){editingItem ? ' — Để trống nếu giữ nguyên' : ''}
              </Label>
              <Input
                id='wh-secret'
                type='password'
                placeholder='whsec_...'
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                required={!editingItem}
              />
            </div>
            <div className='space-y-2'>
              <Label>Trạng thái</Label>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as CreateWebhookSubscriptionDtoStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Chọn trạng thái' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>Đang hoạt động (Active)</SelectItem>
                  <SelectItem value='disabled'>Tạm ngưng (Disabled)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button
                type='submit'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingItem ? 'Lưu thay đổi' : 'Đăng ký Webhook'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
