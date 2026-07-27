'use client';

import { appCopy } from '@/lib/app-copy';

export interface UnauthorizedCardProps {
  title?: string;
  description?: string;
  requestId?: string;
  onRetry?: () => void;
}

export function UnauthorizedCard({
  title = 'Không đủ quyền truy cập',
  description = 'Bạn không có quyền truy cập dữ liệu này. Nếu cần, hãy liên hệ quản trị viên.',
  requestId,
  onRetry,
}: UnauthorizedCardProps) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-2">
        <h3 className="text-lg font-semibold tracking-tight text-destructive">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        {requestId && (
          <div className="mt-2 rounded bg-muted/60 px-2.5 py-1.5 text-xs font-mono text-muted-foreground w-fit">
            Mã sự cố: {requestId}
          </div>
        )}
        {onRetry && (
          <div className="pt-2">
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80 transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
