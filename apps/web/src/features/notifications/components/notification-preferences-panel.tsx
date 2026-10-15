'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getPlatformNotificationsControllerGetPreferencesQueryKey,
  usePlatformNotificationsControllerGetPreferences,
  usePlatformNotificationsControllerUpdatePreferences,
} from '@/api/generated/platform-notifications/platform-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface NotificationPreferencesData {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
}

function extractPreferences(raw: unknown): NotificationPreferencesData {
  if (!raw || typeof raw !== 'object') {
    return { emailEnabled: true, smsEnabled: false, pushEnabled: true };
  }
  const envelope = raw as Record<string, unknown>;
  const inner =
    envelope.data && typeof envelope.data === 'object'
      ? (envelope.data as Record<string, unknown>)
      : envelope;
  return {
    emailEnabled: typeof inner.emailEnabled === 'boolean' ? inner.emailEnabled : true,
    smsEnabled: typeof inner.smsEnabled === 'boolean' ? inner.smsEnabled : false,
    pushEnabled: typeof inner.pushEnabled === 'boolean' ? inner.pushEnabled : true,
  };
}

export function NotificationPreferencesPanel() {
  const queryClient = useQueryClient();
  const prefsQuery = usePlatformNotificationsControllerGetPreferences();

  const prefs = React.useMemo(
    () => extractPreferences(prefsQuery.data),
    [prefsQuery.data]
  );

  const updateMutation = usePlatformNotificationsControllerUpdatePreferences({
    mutation: {
      onSuccess: () => {
        toast.success('Đã lưu tùy chọn thông báo');
        void queryClient.invalidateQueries({
          queryKey: getPlatformNotificationsControllerGetPreferencesQueryKey(),
        });
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Không thể cập nhật tùy chọn');
      },
    },
  });

  const handleToggle = (key: keyof NotificationPreferencesData, checked: boolean) => {
    updateMutation.mutate({
      data: {
        ...prefs,
        [key]: checked,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tùy chọn kênh nhận thông báo</CardTitle>
        <CardDescription>
          Bật hoặc tắt các kênh nhận thông báo cá nhân (Email, SMS, Thông báo đẩy).
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        <div className='flex items-center justify-between rounded-lg border p-4'>
          <div className='space-y-0.5'>
            <Label htmlFor='pref-email' className='text-base font-medium'>
              Thông báo qua Email
            </Label>
            <p className='text-muted-foreground text-sm'>
              Nhận email khi có yêu cầu phê duyệt, phiếu lương mới hoặc thông báo nhân sự quan trọng.
            </p>
          </div>
          <Switch
            id='pref-email'
            checked={Boolean(prefs.emailEnabled)}
            disabled={prefsQuery.isLoading || updateMutation.isPending}
            onCheckedChange={(checked) => handleToggle('emailEnabled', checked)}
          />
        </div>

        <div className='flex items-center justify-between rounded-lg border p-4'>
          <div className='space-y-0.5'>
            <Label htmlFor='pref-push' className='text-base font-medium'>
              Thông báo đẩy (Push & In-App)
            </Label>
            <p className='text-muted-foreground text-sm'>
              Hiển thị thông báo tức thời trên trình duyệt và chuông thông báo hệ thống.
            </p>
          </div>
          <Switch
            id='pref-push'
            checked={Boolean(prefs.pushEnabled)}
            disabled={prefsQuery.isLoading || updateMutation.isPending}
            onCheckedChange={(checked) => handleToggle('pushEnabled', checked)}
          />
        </div>

        <div className='flex items-center justify-between rounded-lg border p-4'>
          <div className='space-y-0.5'>
            <Label htmlFor='pref-sms' className='text-base font-medium'>
              Thông báo qua tin nhắn SMS
            </Label>
            <p className='text-muted-foreground text-sm'>
              Chỉ gửi tin nhắn SMS cho các cảnh báo khẩn cấp hoặc mã xác thực bảo mật.
            </p>
          </div>
          <Switch
            id='pref-sms'
            checked={Boolean(prefs.smsEnabled)}
            disabled={prefsQuery.isLoading || updateMutation.isPending}
            onCheckedChange={(checked) => handleToggle('smsEnabled', checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
