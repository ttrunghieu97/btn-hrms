'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { PresenceManagement } from '../components/presence-management';
import { TimesheetEditorPage } from '../timesheet-editor/timesheet-editor-page';

export function ManagementView() {
  const searchParams = useSearchParams();
  const viewMode = searchParams.get('view');
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (viewMode === 'presence') {
    return (
      <div className="flex min-h-0 flex-1 flex-col space-y-4">
        <div className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-xs">
          <div>
            <h2 className="text-foreground text-sm font-semibold">
              Giám sát hiện diện trực tiếp (Live Presence)
            </h2>
            <p className="text-muted-foreground text-xs">
              Theo dõi trạng thái làm việc thực tế trong ca hôm nay theo phòng
              ban
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs"
              asChild
            >
              <Link href={`/attendance/management/periods/${currentPeriod}`}>
                <Icons.calendar className="mr-1.5 size-3.5" />
                Bảng công kỳ {currentPeriod}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              asChild
            >
              <Link href="/attendance/summary">
                <Icons.check className="mr-1.5 size-3.5" />
                Quy trình &amp; Đối soát
              </Link>
            </Button>
          </div>
        </div>

        <PresenceManagement />
      </div>
    );
  }

  return <TimesheetEditorPage defaultPeriod={currentPeriod} />;
}
