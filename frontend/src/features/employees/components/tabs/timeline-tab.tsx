'use client';

import * as React from 'react';
import type { EmployeeResponseDto } from '@/api/generated/model';
import { useEmployeeTimelineQuery, type TimelineKeyParams } from '../../queries/employee-queries';
import type { TimelineEventDto, TimelineEventType } from '../../api/timeline';
import { Icons } from '@/components/icons';
import { employeeUiCopy } from '@/lib/app-copy';
import { Skeleton } from '@/components/ui/skeleton';

interface TimelineTabProps {
  employee: EmployeeResponseDto | null;
}

/* ------------------------------------------------------------------ */
/* Event type metadata                                                 */
/* ------------------------------------------------------------------ */

const TYPE_ICONS: Record<TimelineEventType, keyof typeof Icons> = {
  system: 'shieldCheck',
  status: 'refresh',
  contract: 'page',
  position: 'department',
};

const TYPE_COLORS: Record<TimelineEventType, string> = {
  system: 'border-l-purple-500',
  status: 'border-l-blue-500',
  contract: 'border-l-amber-500',
  position: 'border-l-emerald-500',
};

const TYPE_LABELS: Record<TimelineEventType, string> = {
  system: 'Hệ thống',
  status: 'Trạng thái',
  contract: 'Hợp đồng',
  position: 'Vị trí',
};

/** Vietnamese display text for each event key */
function getEventLabel(event: TimelineEventDto): string {
  switch (event.event) {
    case 'employee_created':
      return 'Tạo hồ sơ nhân viên';
    case 'status_changed':
      return 'Thay đổi trạng thái';
    case 'contract_created':
      return 'Tạo hợp đồng';
    case 'contract_renewed':
      return 'Gia hạn hợp đồng';
    case 'contract_amended':
      return 'Sửa đổi hợp đồng';
    case 'contract_ended':
      return 'Kết thúc hợp đồng';
    case 'contract_expired':
      return 'Hợp đồng hết hạn';
    case 'assignment_created':
      return 'Bổ nhiệm vị trí';
    case 'position_changed':
      return 'Thay đổi vị trí';
    default:
      return event.event;
  }
}

/** Secondary description rendered below the event label */
function getEventDescription(event: TimelineEventDto): string | null {
  const m = event.metadata;

  switch (event.event) {
    case 'status_changed':
      return [m.newStatus, m.reason].filter(Boolean).join(' — ') || null;
    case 'contract_created':
    case 'contract_renewed':
    case 'contract_amended':
    case 'contract_ended':
    case 'contract_expired': {
      const parts: string[] = [];
      if (m.contractType) parts.push(String(m.contractType));
      if (m.version) parts.push(`V${m.version}`);
      return parts.join(' — ') || null;
    }
    case 'assignment_created':
    case 'position_changed':
      return m.positionName ? String(m.positionName) : null;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Date formatting                                                     */
/* ------------------------------------------------------------------ */

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi} - ${dd}/${mm}/${yyyy}`;
}

/* ------------------------------------------------------------------ */
/* Type filter tabs                                                    */
/* ------------------------------------------------------------------ */

const FILTER_OPTIONS: Array<{ value: TimelineEventType | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'system', label: 'Hệ thống' },
  { value: 'status', label: 'Trạng thái' },
  { value: 'contract', label: 'Hợp đồng' },
  { value: 'position', label: 'Vị trí' },
];

function TypeFilter({
  value,
  onChange,
}: {
  value: TimelineEventType | 'all';
  onChange: (v: TimelineEventType | 'all') => void;
}) {
  return (
    <div className='flex flex-wrap gap-1.5'>
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type='button'
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function TimelineTab({ employee }: TimelineTabProps) {
  const employeeId = employee?.id ?? '';
  const [filter, setFilter] = React.useState<TimelineEventType | 'all'>('all');

  const params: TimelineKeyParams | undefined =
    filter === 'all'
      ? { employeeId, limit: 50 }
      : { employeeId, types: filter, limit: 50 };

  const { data: events, isLoading, error } = useEmployeeTimelineQuery(
    employeeId,
    filter === 'all' ? { limit: 50 } : { types: filter, limit: 50 },
  );

  if (!employee) return null;

  return (
    <div className='rounded-xl border bg-card/60 shadow-sm border-l-4 border-l-purple-500 hover:shadow-md transition-all duration-300'>
      {/* Header */}
      <div className='border-b px-4 py-3'>
        <div className='flex items-center gap-3'>
          <div className='bg-purple-500/10 p-1.5 rounded-lg text-purple-600'>
            <Icons.activity className='size-4' />
          </div>
          <div>
            <h3 className='text-sm font-semibold text-foreground/90'>{employeeUiCopy.activityTimeline}</h3>
            {events && (
              <p className='text-muted-foreground mt-0.5 text-xs'>
                {employeeUiCopy.eventsCountSuffix(events.length)}
              </p>
            )}
          </div>
        </div>
        <div className='mt-3'>
          <TypeFilter value={filter} onChange={setFilter} />
        </div>
      </div>

      {/* Content */}
      <div className='px-4 py-4'>
        {/* Loading state */}
        {isLoading && (
          <div className='space-y-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='flex gap-3'>
                <Skeleton className='mt-1 size-4 shrink-0 rounded-full' />
                <div className='flex-1 space-y-1.5'>
                  <Skeleton className='h-3.5 w-32' />
                  <Skeleton className='h-3 w-48' />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className='flex flex-col items-center gap-2 py-8 text-center text-sm'>
            <Icons.alertCircle className='size-6 text-destructive' />
            <p className='text-muted-foreground'>{employeeUiCopy.loadTimelineFailed}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!events || events.length === 0) && (
          <div className='py-8 text-center text-sm text-muted-foreground'>
            {employeeUiCopy.noTimelineData}
          </div>
        )}

        {/* Timeline */}
        {events && events.length > 0 && !isLoading && !error && (
          <div className='space-y-0'>
            {events.map((event, idx) => {
              const Icon = Icons[TYPE_ICONS[event.type]];
              const isLast = idx === events.length - 1;

              return (
                <div
                  key={event.id}
                  className={`relative border-l-2 pl-4 pb-4 ${
                    isLast ? 'pb-0' : ''
                  } ${TYPE_COLORS[event.type] ?? 'border-l-gray-300'}`}
                >
                  {/* Dot + timestamp row */}
                  <div className='-ml-[calc(0.5rem+1px)] mb-0.5 flex items-center gap-2'>
                    <span className='inline-flex size-2 items-center justify-center rounded-full bg-background ring-1 ring-ring'>
                      <Icon className='size-3 text-muted-foreground' />
                    </span>
                    <span className='text-muted-foreground text-xs'>
                      {formatEventDate(event.occurredAt)}
                    </span>
                    <span
                      className={`rounded px-1 py-0.5 text-[10px] font-medium uppercase ${
                        event.type === 'system'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : event.type === 'status'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : event.type === 'contract'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}
                    >
                      {TYPE_LABELS[event.type]}
                    </span>
                  </div>

                  {/* Event title */}
                  <p className='text-sm font-medium leading-snug'>
                    {getEventLabel(event)}
                  </p>

                  {/* Event description */}
                  {getEventDescription(event) && (
                    <p className='text-muted-foreground mt-0.5 text-xs leading-snug'>
                      {getEventDescription(event)}
                    </p>
                  )}

                  {/* Actor name */}
                  {event.actorName && (
                    <p className='mt-0.5 text-[11px] text-muted-foreground/60'>
                      bởi {event.actorName}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
