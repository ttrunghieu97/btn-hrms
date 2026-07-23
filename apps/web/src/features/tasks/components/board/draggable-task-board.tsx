'use client';

import { useCallback, useMemo, useState } from 'react';
import { formatDateVN } from "@/lib/date";
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Kanban, KanbanBoard, KanbanColumn, KanbanItem, KanbanOverlay } from '@/components/ui/kanban';
import { commonUiCopy } from '@/lib/app-copy';
import { feedbackCopy } from '@/lib/feedback-copy';
import { getQueryClient } from '@/lib/query-client';
import { useTasksQuery, useTransitionTaskMutation } from '../../queries/task-queries';
import { TASK_STATES, type TaskState, type TaskAction } from '../../workflow/machine';
import { groupTasksByState } from './board-store';
import { diagnoseBoard } from './board-validation';
import { BoardDiagnosticsPanel } from './board-diagnostics-panel';
import { createBoardIntent, intentToApiPayload } from './board-intent';
import { workflowLogger } from '@/lib/workflow/audit/workflow-logger';
import { useAuthStore } from '@/stores/auth-store';
import type { Task } from '../../utils/task-types';
import type { UniqueIdentifier } from '@dnd-kit/core';
import { getActionUiConfig } from '../workflow/workflow-ui';

/* ------------------------------------------------------------------ */
/* Column label map                                                    */
/* ------------------------------------------------------------------ */

const COLUMN_LABELS: Partial<Record<TaskState, string>> = {
  created: 'Mới',
  assigned: 'Đã giao',
  in_progress: 'Đang làm',
  submitted: 'Chờ duyệt',
  revision: 'Cần sửa',
  declined: 'Từ chối',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

/* ------------------------------------------------------------------ */
/* Priority badge                                                       */
/* ------------------------------------------------------------------ */

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-blue-50 text-blue-600',
    high: 'bg-orange-50 text-orange-600',
    urgent: 'bg-red-50 text-red-600',
  };
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colors[priority] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {priority}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Card (draggable)                                                     */
/* ------------------------------------------------------------------ */

function BoardCard({ task, isDragging }: { task: Task; isDragging?: boolean }) {
  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-sm ${
        isDragging ? 'rotate-2 shadow-lg opacity-90' : ''
      }`}
    >
      <CardHeader className='p-3 pb-0'>
        <div className='flex items-start justify-between gap-2'>
          <span className='line-clamp-2 text-sm font-medium'>{task.title}</span>
          {task.priority && <PriorityBadge priority={task.priority} />}
        </div>
      </CardHeader>
      <CardContent className='p-3 pt-2'>
        <div className='text-muted-foreground flex items-center gap-2 text-xs'>
          {task.assignee ? (
            <>
              <Icons.user className='h-3 w-3' />
              <span className='truncate'>
                {(task.assignee as { fullName?: string }).fullName ?? '—'}
              </span>
            </>
          ) : null}
          {task.dueDate ? (
            <>
              <Icons.clock className='h-3 w-3' />
              <span>{formatDateVN(task.dueDate)}</span>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Board skeleton                                                       */
/* ------------------------------------------------------------------ */

function BoardSkeleton() {
  return (
    <div className='flex gap-4 p-4'>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className='flex w-[300px] shrink-0 flex-col gap-3'>
          <Skeleton className='h-5 w-20' />
          {Array.from({ length: 3 }).map((_, j) => (
            <Skeleton key={j} className='h-24 w-full rounded-lg' />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Draggable board                                                      */
/* ------------------------------------------------------------------ */

export function DraggableTaskBoard({ onCardClick }: { onCardClick?: (task: Task) => void }) {
  const queryClient = getQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const { data, isLoading } = useTasksQuery({ limit: 200 });
  const transitionMutation = useTransitionTaskMutation(queryClient);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const currentActor = useMemo(() => ({
    id: authUser?.id ?? 'unknown',
    role: authUser?.isSuperAdmin ? 'admin' as const : 'manager' as const,
  }), [authUser?.id, authUser?.isSuperAdmin]);

  const columns = useMemo(() => {
    if (!data?.tasks) return undefined;
    return groupTasksByState(data.tasks as Task[]);
  }, [data?.tasks]);

  const diagnostics = useMemo(() => {
    if (!data?.tasks) return null;
    return diagnoseBoard(data.tasks as Task[]);
  }, [data?.tasks]);

  /* Convert grouped map to Kanban value format (Record<state, Task[]>) */
  const kanbanValue = useMemo(() => {
    if (!columns) return {};
    const record: Record<string, Task[]> = {};
    for (const state of TASK_STATES) {
      const tasks = columns.get(state) ?? [];
      if (tasks.length > 0 || !['completed', 'cancelled', 'declined'].includes(state)) {
        record[state] = [...tasks];
      }
    }
    return record;
  }, [columns]);

  const getItemValue = useCallback((task: Task) => task.id, []);

  /* ------------------------------------------------------------------ */
  /* Drag handlers                                                        */
  /* ------------------------------------------------------------------ */

  const handleDragStart = useCallback(
    (_event: unknown) => {
      // Could set active task for drag overlay here
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: { active: { id: UniqueIdentifier }; over?: { id: UniqueIdentifier } | null }) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const targetState = over.id as string;
      const task = (data?.tasks as Task[] | undefined)?.find((t) => t.id === active.id);
      if (!task) {
        toast.error(feedbackCopy.failure.executeAction);
        return;
      }

      // Derive dynamic actor role for this specific task
      let role: 'admin' | 'creator' | 'assignee' | 'manager' = 'manager';
      if (authUser?.isSuperAdmin) {
        role = 'admin';
      } else if (authUser?.id === task.createdByUserId) {
        role = 'creator';
      } else if (authUser?.username === task.assignee?.employeeCode || authUser?.employeeUsername === task.assignee?.employeeCode) {
        role = 'assignee';
      }

      const taskActor = {
        id: authUser?.id ?? 'unknown',
        role,
      };

      // Build intent with real actor
      workflowLogger.transitionAttempt({
        domain: 'task', entityId: task.id, action: `drag-to-${targetState}`,
        fromState: task.status, actorId: taskActor.id, actorRole: taskActor.role,
      });

      const intent = createBoardIntent(
        task,
        targetState as TaskState,
        taskActor,
      );

      if (!intent.ok) {
        toast.error(intent.reason);
        workflowLogger.transitionFailed({
          domain: 'task', entityId: task.id, action: `drag-to-${targetState}`,
          fromState: task.status, actorId: taskActor.id, actorRole: taskActor.role,
          error: intent.reason,
        });
        return;
      }

      // Execute
      const payload = intentToApiPayload(intent.intent);
      transitionMutation.mutate(
        {
          id: task.id,
          data: payload as Parameters<typeof transitionMutation.mutate>[0]['data'],
        },
        {
          onSuccess: () => {
            const label = COLUMN_LABELS[targetState as TaskState] ?? targetState;
            toast.success(feedbackCopy.success.workflowAction(label));
            workflowLogger.transitionSuccess({
              domain: 'task', entityId: task.id, action: intent.intent.action,
              fromState: intent.intent.fromState, toState: intent.intent.toState,
              actorId: taskActor.id, actorRole: taskActor.role,
            });
          },
          onError: (err) => {
            toast.error(feedbackCopy.failure.executeAction);
            workflowLogger.transitionFailed({
              domain: 'task', entityId: task.id, action: intent.intent.action,
              fromState: intent.intent.fromState, actorId: taskActor.id,
              actorRole: taskActor.role, error: String(err),
            });
          },
        },
      );
    },
    [data?.tasks, transitionMutation, authUser],
  );

  if (isLoading) {
    return <BoardSkeleton />;
  }

  if (!columns) {
    return (
      <div className='flex items-center justify-center py-16'>
        <div className='text-muted-foreground flex items-center gap-2 text-sm'>
          <Icons.spinner className='h-4 w-4 animate-spin' />
          {commonUiCopy.loading}
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-2'>
      <BoardDiagnosticsPanel diagnostics={diagnostics} />
      <Kanban
        value={kanbanValue}
        getItemValue={getItemValue}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className='w-full rounded-md pb-4'>
          <KanbanBoard className='flex items-start'>
            {Object.entries(kanbanValue).map(([columnValue, tasks]) => (
              <KanbanColumn key={columnValue} value={columnValue} className='w-[300px] shrink-0'>
                <div className='flex items-center gap-2 px-0.5 pb-3'>
                  <span className='text-sm font-semibold'>
                    {COLUMN_LABELS[columnValue as TaskState] ?? columnValue}
                  </span>
                  <Badge variant='secondary' className='pointer-events-none rounded-sm'>
                    {tasks.length}
                  </Badge>
                </div>
                <div className='flex flex-col gap-2'>
                  {tasks.map((task) => (
                    <KanbanItem key={task.id} value={task.id} onClick={() => onCardClick?.(task)}>
                      <BoardCard task={task} />
                    </KanbanItem>
                  ))}
                </div>
              </KanbanColumn>
            ))}
          </KanbanBoard>
          <ScrollBar orientation='horizontal' />
        </ScrollArea>
        <KanbanOverlay>
          {({ value }) => {
            const task = Object.values(kanbanValue).flat().find((t) => t.id === value);
            if (!task) return null;
            return <BoardCard task={task} isDragging />;
          }}
        </KanbanOverlay>
      </Kanban>
    </div>
  );
}
