import type { TaskResponseDtoStatus } from '@/api/generated/model';
import { taskUiCopy } from '@/lib/app-copy';

type StatusConfig = {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
};

export const TASK_STATUS_MAP: Record<TaskResponseDtoStatus, StatusConfig> = {
  created: {
    label: taskUiCopy.table.statusCreated,
    variant: 'outline',
    className: 'border-slate-300 text-slate-600'
  },
  assigned: {
    label: taskUiCopy.table.statusAssigned,
    variant: 'outline',
    className: 'border-blue-300 text-blue-600 bg-blue-50'
  },
  in_progress: {
    label: taskUiCopy.table.statusInProgress,
    variant: 'outline',
    className: 'border-yellow-300 text-yellow-700 bg-yellow-50'
  },
  declined: {
    label: taskUiCopy.table.statusDeclined,
    variant: 'destructive',
    className: ''
  },
  submitted: {
    label: taskUiCopy.table.statusSubmitted,
    variant: 'outline',
    className: 'border-purple-300 text-purple-600 bg-purple-50'
  },
  revision: {
    label: taskUiCopy.table.statusRevision,
    variant: 'outline',
    className: 'border-orange-300 text-orange-600 bg-orange-50'
  },
  completed: {
    label: taskUiCopy.table.statusCompleted,
    variant: 'outline',
    className: 'border-green-300 text-green-600 bg-green-50'
  },
  cancelled: {
    label: taskUiCopy.table.statusCancelled,
    variant: 'outline',
    className: 'border-slate-300 text-slate-400'
  }
};

export function getTaskStatusConfig(status: string): StatusConfig {
  return (
    TASK_STATUS_MAP[status as TaskResponseDtoStatus] ?? {
      label: status,
      variant: 'outline' as const,
      className: ''
    }
  );
}

type PriorityConfig = {
  label: string;
  className: string;
};

export const TASK_PRIORITY_MAP: Record<string, PriorityConfig> = {
  low: { label: taskUiCopy.table.priorityLow, className: 'text-slate-500' },
  medium: { label: taskUiCopy.table.priorityMedium, className: 'text-blue-600' },
  high: { label: taskUiCopy.table.priorityHigh, className: 'text-orange-600 font-medium' },
  urgent: { label: taskUiCopy.table.priorityUrgent, className: 'text-red-600 font-semibold' }
};

export function getTaskPriorityConfig(priority: string | undefined | null): PriorityConfig {
  return (
    TASK_PRIORITY_MAP[priority ?? 'medium'] ?? {
      label: priority ?? taskUiCopy.table.priorityMedium,
      className: ''
    }
  );
}

export const TASK_STATUS_OPTIONS = Object.entries(TASK_STATUS_MAP).map(([value, config]) => ({
  label: config.label,
  value
}));

export const TASK_PRIORITY_OPTIONS = Object.entries(TASK_PRIORITY_MAP).map(([value, config]) => ({
  label: config.label,
  value
}));
