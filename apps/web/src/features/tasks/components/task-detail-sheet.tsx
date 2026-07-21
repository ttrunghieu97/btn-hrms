'use client';

import * as React from 'react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { formatDateTimeVN } from "@/lib/date";
import { useQueryState } from 'nuqs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Icons } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { commonUiCopy, taskUiCopy } from '@/lib/app-copy';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import { getQueryClient } from '@/lib/query-client';
import { getTaskStatusConfig, getTaskPriorityConfig } from '../utils/task-status';
import type { Task } from '../utils/task-types';
import {
  useRemoveTaskMutation,
  useTaskByIdQuery,
  useSubtasksQuery,
  useUpdateTaskMutation
} from '../queries/task-queries';
import { TaskWorkflowActions } from './task-workflow-actions';
import { TaskActivityTimeline } from './task-activity-timeline';
import { TaskCommentsSection } from './task-comments-section';
import { DeadlineBar } from './deadline-bar';
import { cn } from '@/lib/utils';

interface TaskDetailSheetProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (task: Task) => void;
}

interface ChecklistItem {
  text: string;
  done?: boolean;
}

function formatDate(value: string | null | undefined, fallback = '—') {
  if (!value?.trim()) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return formatDateTimeVN(date);
}

function getInitials(name?: string | null) {
  if (!name || typeof name !== 'string') return 'NV';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='flex items-start gap-3 py-1'>
      <span className='text-muted-foreground w-36 shrink-0 text-sm font-medium'>{label}</span>
      <span className='text-sm flex-1 font-medium'>{children}</span>
    </div>
  );
}

export function TaskDetailSheet({ taskId, open, onOpenChange, onEdit }: TaskDetailSheetProps) {
  const queryClient = getQueryClient();
  const removeMutation = useRemoveTaskMutation(queryClient);
  const updateMutation = useUpdateTaskMutation(queryClient);
  const [_, setDetailId] = useQueryState('detail');

  const { data: task, isLoading, error } = useTaskByIdQuery(taskId ?? '');
  const { data: subtasks } = useSubtasksQuery(task?.id ?? '');

  const parsedChecklist = React.useMemo<ChecklistItem[]>(() => {
    if (!task?.checklist) return [];
    try {
      return typeof task.checklist === 'string'
        ? JSON.parse(task.checklist)
        : task.checklist;
    } catch {
      return [];
    }
  }, [task?.checklist]);

  function handleDelete() {
    if (!task) return;
    removeMutation.mutate(task.id, {
      onSuccess: () => {
        toast.success(feedbackCopy.success.deleted(feedbackEntity.task));
        onOpenChange(false);
      },
      onError: () => toast.error(feedbackCopy.failure.delete(feedbackEntity.task))
    });
  }

  function handleToggleChecklist(index: number, checked: boolean) {
    if (!task) return;
    const nextList = [...parsedChecklist];
    nextList[index] = { ...nextList[index], done: checked };

    // Calculate new progress based on checklist ratio
    const doneCount = nextList.filter(item => item.done).length;
    const totalCount = nextList.length;
    const nextProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : task.progress;

    updateMutation.mutate(
      {
        id: task.id,
        patch: {
          checklist: nextList as any,
          progress: nextProgress
        }
      },
      {
        onSuccess: () => {
          toast.success('Đã cập nhật danh sách đầu việc');
        },
        onError: () => {
          toast.error('Không thể cập nhật danh sách đầu việc');
        }
      }
    );
  }

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className='w-full sm:max-w-4xl lg:max-w-5xl flex items-center justify-center'>
          <div className="flex flex-col items-center gap-2">
            <Icons.spinner className="size-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">{taskUiCopy.detail.loadingDetails}</span>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (error || !task) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className='w-full sm:max-w-4xl lg:max-w-5xl'>
          <VisuallyHidden asChild>
            <SheetTitle>{taskUiCopy.detail.emptyTitle}</SheetTitle>
          </VisuallyHidden>
          <VisuallyHidden asChild>
            <SheetDescription>{taskUiCopy.detail.emptyDescription}</SheetDescription>
          </VisuallyHidden>
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-sm text-muted-foreground">
              {error ? 'Đã xảy ra lỗi khi tải dữ liệu' : taskUiCopy.detail.emptyDescription}
            </span>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const statusConfig = getTaskStatusConfig(task.status);
  const priorityConfig = getTaskPriorityConfig(task.priority);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className='w-full sm:max-w-4xl lg:max-w-5xl flex flex-col p-0'
          onPointerDownOutside={(e) => {
            const dialogs = document.querySelectorAll('[role="dialog"]');
            if (dialogs.length > 1) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const dialogs = document.querySelectorAll('[role="dialog"]');
            if (dialogs.length > 1) {
              e.preventDefault();
            }
          }}
        >
          <VisuallyHidden asChild>
            <SheetTitle>{taskUiCopy.detail.title(task.title)}</SheetTitle>
          </VisuallyHidden>
          <VisuallyHidden asChild>
            <SheetDescription>{taskUiCopy.detail.description(task.title)}</SheetDescription>
          </VisuallyHidden>

          <div className='flex-1 overflow-y-auto px-6 py-6'>
            {/* Header section */}
            <div className='mb-5 flex items-start justify-between gap-3'>
              <div className='min-w-0 flex-1'>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={statusConfig.variant} className={statusConfig.className}>
                    {statusConfig.label}
                  </Badge>
                  {task.parent && (
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-muted font-bold flex items-center gap-1 border-primary/20 text-primary"
                      onClick={() => setDetailId(task.parent?.id ?? null)}
                    >
                      <Icons.task className="size-3" /> {taskUiCopy.detail.parentTaskPrefix} {task.parent.title}
                    </Badge>
                  )}
                </div>
                <h2 className='text-xl font-bold tracking-tight text-foreground'>{task.title}</h2>
                {task.description && (
                  <p className='text-muted-foreground mt-2 text-sm whitespace-pre-wrap leading-relaxed'>
                    {task.description}
                  </p>
                )}
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <Button variant='outline' size='sm' onClick={() => onEdit?.(task)} className="h-9 px-3">
                  <Icons.edit className='mr-1.5 h-3.5 w-3.5' />
                  {taskUiCopy.detail.edit}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant='outline' size='sm' className='text-destructive hover:bg-destructive/5 h-9 px-3'>
                      <Icons.trash className='mr-1.5 h-3.5 w-3.5' />
                      {commonUiCopy.delete}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{taskUiCopy.detail.deleteTitle}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {taskUiCopy.detail.deleteDescription(task.title)}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{commonUiCopy.cancel}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={removeMutation.isPending}>
                        {removeMutation.isPending && <Icons.spinner className='mr-1 h-3 w-3 animate-spin' />}
                        {commonUiCopy.delete}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Workflow Transition Buttons */}
            <div className='mb-6 bg-muted/5 border p-3.5 rounded-xl'>
              <TaskWorkflowActions task={task} />
            </div>

            {/* Main Info Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 bg-muted/5 border p-5 rounded-2xl'>
              <InfoRow label={taskUiCopy.detail.priorityLabel}>
                <span className={cn('font-semibold', priorityConfig.className)}>
                  {priorityConfig.label}
                </span>
              </InfoRow>

              <InfoRow label={taskUiCopy.detail.assigneeLabel}>
                {task.assignee ? (
                  <div className='flex items-center gap-2'>
                    <Avatar className='size-5.5'>
                      <AvatarFallback className='text-[8px] bg-primary/10 text-primary font-bold'>
                        {getInitials(task.assignee.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-foreground">{task.assignee.fullName}</span>
                    {task.assignee.departmentName && (
                      <span className='text-muted-foreground text-xs'>
                        ({task.assignee.departmentName})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className='text-muted-foreground font-normal'>{taskUiCopy.detail.unassigned}</span>
                )}
              </InfoRow>

              {task.startedAt && (
                <InfoRow label={taskUiCopy.detail.startedAtLabel}>{formatDate(task.startedAt)}</InfoRow>
              )}

              {task.completedAt && (
                <InfoRow label={taskUiCopy.detail.completedAtLabel}>{formatDate(task.completedAt)}</InfoRow>
              )}

              {task.rejectionReason && (
                <InfoRow label={taskUiCopy.detail.rejectionReasonLabel}>
                  <span className='text-red-600 font-semibold'>{task.rejectionReason}</span>
                </InfoRow>
              )}

              {task.revisionReason && (
                <InfoRow label={taskUiCopy.detail.revisionReasonLabel}>
                  <span className='text-orange-600 font-semibold'>{task.revisionReason}</span>
                </InfoRow>
              )}

              {task.cancellationReason && (
                <InfoRow label={taskUiCopy.detail.cancellationReasonLabel}>
                  <span className='text-muted-foreground font-normal'>{task.cancellationReason}</span>
                </InfoRow>
              )}

              {task.resultText && (
                <InfoRow label={taskUiCopy.detail.resultLabel}>
                  <span className='whitespace-pre-wrap text-foreground font-normal leading-relaxed'>{task.resultText}</span>
                </InfoRow>
              )}



              <div className="col-span-2 mt-3 pt-3">
                <DeadlineBar createdAt={task.createdAt} dueDate={task.dueDate} completedAt={task.completedAt} />
              </div>
            </div>

            {/* Checklist Section */}
            <div className="my-6">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                <Icons.circleCheck className="size-4.5 text-primary" /> {taskUiCopy.detail.checklistProgress}
              </h3>
              {parsedChecklist.length > 0 ? (
                <div className="border rounded-2xl p-4 bg-muted/5 space-y-3">
                  {parsedChecklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-0.5">
                      <Checkbox
                        id={`detail-chk-${idx}`}
                        checked={item.done}
                        onCheckedChange={(checked) => handleToggleChecklist(idx, !!checked)}
                        disabled={updateMutation.isPending}
                        className="size-4.5"
                      />
                      <label
                        htmlFor={`detail-chk-${idx}`}
                        className={cn('text-sm font-medium leading-none cursor-pointer select-none', item.done && 'line-through text-muted-foreground')}
                      >
                        {item.text}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed rounded-2xl bg-muted/5">
                  <span className="text-xs text-muted-foreground">{taskUiCopy.detail.noChecklist}</span>
                </div>
              )}
            </div>

            {/* Subtasks Section */}
            {subtasks && subtasks.length > 0 && (
              <div className="my-6">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                  <Icons.task className="size-4.5 text-primary" /> {taskUiCopy.detail.subtasksCount(subtasks.length)}
                </h3>
                <div className="border rounded-2xl divide-y bg-muted/5 overflow-hidden">
                  {subtasks.map((sub) => {
                    const subStatus = getTaskStatusConfig(sub.status);
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3.5 hover:bg-muted/15 cursor-pointer transition-all"
                        onClick={() => setDetailId(sub.id)}
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">{sub.title}</span>
                          {sub.assignee && (
                            <span className="text-xs text-muted-foreground">{taskUiCopy.detail.assigneeLabel}: {sub.assignee.fullName}</span>
                          )}
                        </div>
                        <Badge variant={subStatus.variant} className={cn('text-[10px] py-0.5 px-2 font-bold shrink-0', subStatus.className)}>
                          {subStatus.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator className='my-6' />
            <TaskActivityTimeline taskId={task.id} />

            <Separator className='my-6' />
            <TaskCommentsSection taskId={task.id} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
