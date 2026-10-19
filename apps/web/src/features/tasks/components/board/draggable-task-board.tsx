'use client';

import { useCallback, useMemo, useState } from 'react';
import { formatDateVN } from "@/lib/date";
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Kanban, KanbanBoard, KanbanColumn, KanbanItem, KanbanOverlay } from '@/components/ui/kanban';
import { commonUiCopy, taskUiCopy } from '@/lib/app-copy';
import { feedbackCopy } from '@/lib/feedback-copy';
import { getQueryClient } from '@/lib/query-client';
import { useTasksQuery, useTransitionTaskMutation } from '../../queries/task-queries';
import { canTransition, TASK_STATES, type TaskActor, type TaskState, type TaskAction } from '../../workflow/machine';
import { groupTasksByState } from './board-store';
import { diagnoseBoard } from './board-validation';
import { BoardDiagnosticsPanel } from './board-diagnostics-panel';
import {
  createBoardIntent,
  inferAction,
  intentToApiPayload,
  resolveTargetColumnState,
  type TransitionIntentMetadata,
} from './board-intent';
import { workflowLogger } from '@/lib/workflow/audit/workflow-logger';
import { useAuthStore } from '@/stores/auth-store';
import type { Task } from '../../utils/task-types';
import type { UniqueIdentifier } from '@dnd-kit/core';
import { getActionUiConfig, type ActionDialogType } from '../workflow/workflow-ui';

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
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    high: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
    urgent: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  };
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colors[priority] ?? 'bg-muted text-muted-foreground'}`}
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

interface PendingDragTransition {
  task: Task;
  targetState: TaskState;
  taskActor: TaskActor;
  action: TaskAction;
  dialogType: Exclude<ActionDialogType, 'direct'>;
}

/* ------------------------------------------------------------------ */
/* Draggable board                                                      */
/* ------------------------------------------------------------------ */

export function DraggableTaskBoard({ onCardClick }: { onCardClick?: (task: Task) => void }) {
  const queryClient = getQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const { data, isLoading } = useTasksQuery({ limit: 200 });
  const transitionMutation = useTransitionTaskMutation(queryClient);

  const [pendingDrag, setPendingDrag] = useState<PendingDragTransition | null>(null);
  const [reason, setReason] = useState('');
  const [resultText, setResultText] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

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

  const executeBoardTransition = useCallback(
    (
      task: Task,
      targetState: TaskState,
      taskActor: TaskActor,
      metadata?: TransitionIntentMetadata,
    ) => {
      const intent = createBoardIntent(task, targetState, taskActor, metadata);

      if (!intent.ok) {
        toast.error(intent.reason);
        workflowLogger.transitionFailed({
          domain: 'task',
          entityId: task.id,
          action: `drag-to-${targetState}`,
          fromState: task.status,
          actorId: taskActor.id,
          actorRole: taskActor.role,
          error: intent.reason,
        });
        return;
      }

      const payload = intentToApiPayload(intent.intent);
      transitionMutation.mutate(
        {
          id: task.id,
          data: payload as Parameters<typeof transitionMutation.mutate>[0]['data'],
        },
        {
          onSuccess: () => {
            const label = COLUMN_LABELS[targetState] ?? targetState;
            toast.success(feedbackCopy.success.workflowAction(label));
            workflowLogger.transitionSuccess({
              domain: 'task',
              entityId: task.id,
              action: intent.intent.action,
              fromState: intent.intent.fromState,
              toState: intent.intent.toState,
              actorId: taskActor.id,
              actorRole: taskActor.role,
            });
            setPendingDrag(null);
          },
          onError: (err) => {
            toast.error(feedbackCopy.failure.executeAction);
            workflowLogger.transitionFailed({
              domain: 'task',
              entityId: task.id,
              action: intent.intent.action,
              fromState: intent.intent.fromState,
              actorId: taskActor.id,
              actorRole: taskActor.role,
              error: String(err),
            });
          },
        },
      );
    },
    [transitionMutation],
  );

  /* ------------------------------------------------------------------ */
  /* Drag handlers                                                        */
  /* ------------------------------------------------------------------ */

  const handleDragStart = useCallback(
    (_event: unknown) => {
      // KanbanOverlay reads activeId from KanbanContext
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: { active: { id: UniqueIdentifier }; over?: { id: UniqueIdentifier } | null }) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const allTasks = data?.tasks as Task[] | undefined;
      const task = allTasks?.find((t) => t.id === active.id);
      if (!task) {
        toast.error(feedbackCopy.failure.executeAction);
        return;
      }

      const targetState = resolveTargetColumnState(over.id, kanbanValue, allTasks);
      if (!targetState || targetState === task.status) {
        return;
      }

      // Derive dynamic actor role for this specific task
      let role: 'admin' | 'creator' | 'assignee' | 'manager' = 'manager';
      if (authUser?.isSuperAdmin) {
        role = 'admin';
      } else if (authUser?.id === task.createdByUserId) {
        role = 'creator';
      } else if (
        authUser?.username === task.assignee?.employeeCode ||
        authUser?.employeeUsername === task.assignee?.employeeCode
      ) {
        role = 'assignee';
      }

      const taskActor: TaskActor = {
        id: authUser?.id ?? 'unknown',
        role,
      };

      workflowLogger.transitionAttempt({
        domain: 'task',
        entityId: task.id,
        action: `drag-to-${targetState}`,
        fromState: task.status,
        actorId: taskActor.id,
        actorRole: taskActor.role,
      });

      const fromState = task.status as TaskState;
      const action = inferAction(fromState, targetState);
      if (action) {
        const guard = canTransition(
          {
            state: fromState,
            createdById: task.createdByUserId ?? '',
            assigneeId: task.assignee?.id ?? null,
          },
          action,
          taskActor,
        );
        if (guard.ok) {
          const uiConfig = getActionUiConfig(action);
          if (uiConfig.dialogType !== 'direct') {
            setReason('');
            setResultText('');
            setAssigneeId(task.assignee?.id ?? '');
            setPendingDrag({
              task,
              targetState,
              taskActor,
              action,
              dialogType: uiConfig.dialogType,
            });
            return;
          }
        }
      }

      executeBoardTransition(task, targetState, taskActor);
    },
    [data?.tasks, kanbanValue, authUser, executeBoardTransition],
  );

  const handleConfirmPendingDrag = useCallback(() => {
    if (!pendingDrag) return;
    const { task, targetState, taskActor, dialogType } = pendingDrag;
    const metadata: TransitionIntentMetadata = {};
    if (dialogType === 'reason') {
      if (!reason.trim()) {
        toast.error(taskUiCopy.workflow.reasonDescription);
        return;
      }
      metadata.reason = reason.trim();
    } else if (dialogType === 'result') {
      if (!resultText.trim()) {
        toast.error(taskUiCopy.workflow.resultDescription);
        return;
      }
      metadata.resultText = resultText.trim();
    } else if (dialogType === 'assign') {
      if (!assigneeId.trim()) {
        toast.error(feedbackCopy.warning.selectEmployee);
        return;
      }
      metadata.assigneeId = assigneeId.trim();
    }

    executeBoardTransition(task, targetState, taskActor, metadata);
  }, [pendingDrag, reason, resultText, assigneeId, executeBoardTransition]);

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
                    <KanbanItem
                      key={task.id}
                      value={task.id}
                      asHandle
                      onClick={() => onCardClick?.(task)}
                    >
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

      <Dialog
        open={Boolean(pendingDrag)}
        onOpenChange={(open) => {
          if (!open) setPendingDrag(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingDrag ? getActionUiConfig(pendingDrag.action).label : ''}
            </DialogTitle>
            <DialogDescription>
              {pendingDrag?.dialogType === 'reason'
                ? taskUiCopy.workflow.reasonDescription
                : pendingDrag?.dialogType === 'result'
                  ? taskUiCopy.workflow.resultDescription
                  : taskUiCopy.workflow.assignDescription}
            </DialogDescription>
          </DialogHeader>
          {pendingDrag?.dialogType === 'reason' && (
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={taskUiCopy.workflow.reasonPlaceholder}
              rows={3}
            />
          )}
          {pendingDrag?.dialogType === 'result' && (
            <Textarea
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              placeholder={taskUiCopy.workflow.resultPlaceholder}
              rows={4}
            />
          )}
          {pendingDrag?.dialogType === 'assign' && (
            <Input
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              placeholder={commonUiCopy.selectEmployee}
            />
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setPendingDrag(null)}>
              {commonUiCopy.cancel}
            </Button>
            <Button onClick={handleConfirmPendingDrag} disabled={transitionMutation.isPending}>
              {transitionMutation.isPending && (
                <Icons.spinner className='mr-1 h-3 w-3 animate-spin' />
              )}
              {commonUiCopy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
