'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { commonUiCopy, taskUiCopy } from '@/lib/app-copy';
import { feedbackCopy } from '@/lib/feedback-copy';
import { getQueryClient } from '@/lib/query-client';
import { cn } from '@/lib/utils';
import { TransitionTaskDtoTransition } from '@/api/generated/model';
import type { Task } from '../utils/task-types';
import {
  useTransitionTaskMutation,
  useTaskTransitionsQuery
} from '../queries/task-queries';
import { useQuery } from '@tanstack/react-query';
import { employeesQueryOptions } from '@/features/employees';
import { getActionUiConfig, type ActionDialogType } from '../components/workflow/workflow-ui';

interface TaskWorkflowActionsProps {
  task: Task;
}

export function TaskWorkflowActions({ task }: TaskWorkflowActionsProps) {
  const queryClient = getQueryClient();
  const transitionsQuery = useTaskTransitionsQuery(task.id);
  const transitionMutation = useTransitionTaskMutation(queryClient);

  const [dialogType, setDialogType] = React.useState<ActionDialogType | null>(null);
  const [pendingTransition, setPendingTransition] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');
  const [resultText, setResultText] = React.useState('');
  const [assigneeId, setAssigneeId] = React.useState('');
  const [assigneePopoverOpen, setAssigneePopoverOpen] = React.useState(false);

  const employeesQuery = useQuery(employeesQueryOptions({ limit: 500 }));
  const employeeOptions = React.useMemo(
    () =>
      (employeesQuery.data?.employees ?? []).map((emp) => ({
        value: emp.id,
        label: `${emp.firstName} ${emp.lastName}${emp.employeeCode ? ` (${emp.employeeCode})` : ''}`.trim()
      })),
    [employeesQuery.data?.employees]
  );

  type TransitionOption = {
    transition: string;
    targetStatus?: string;
    requiresReason?: boolean;
  };

  const availableTransitions = (transitionsQuery.data ?? []) as TransitionOption[];

  function handleTransition(item: TransitionOption) {
    const action = item.transition;
    const config = getActionUiConfig(action);
    if (config.dialogType === 'direct') {
      executeTransition(action);
      return;
    }
    setPendingTransition(action);
    setReason('');
    setResultText('');
    setAssigneeId('');
    setDialogType(config.dialogType);
  }

  function executeTransition(transition: string, extra?: { reason?: string; resultText?: string; assigneeId?: string }) {
    transitionMutation.mutate(
      {
        id: task.id,
        data: {
          transition: transition as (typeof TransitionTaskDtoTransition)[keyof typeof TransitionTaskDtoTransition],
          ...(extra?.reason && { reason: extra.reason }),
          ...(extra?.resultText && { resultText: extra.resultText }),
          ...(extra?.assigneeId && { assigneeId: extra.assigneeId as unknown as undefined })
        }
      },
      {
        onSuccess: () => {
          toast.success(
            feedbackCopy.success.workflowAction(getActionUiConfig(transition).label)
          );
          setDialogType(null);
          setPendingTransition(null);
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : feedbackCopy.failure.executeAction);
        }
      }
    );
  }

  function handleDialogConfirm() {
    if (!pendingTransition) return;
    if (dialogType === 'reason') {
      executeTransition(pendingTransition, { reason });
    } else if (dialogType === 'result') {
      executeTransition(pendingTransition, { resultText });
    } else if (dialogType === 'assign') {
      if (!assigneeId) {
        toast.error(feedbackCopy.warning.selectEmployee);
        return;
      }
      executeTransition(pendingTransition, { assigneeId });
    }
  }

  if (!availableTransitions.length) return null;

  return (
    <>
      <div className='flex flex-wrap gap-2'>
        {availableTransitions.map((item) => {
          const config = getActionUiConfig(item.transition);
          return (
            <Button
              key={item.transition}
              variant={config.variant}
              size='sm'
              onClick={() => handleTransition(item)}
              disabled={transitionMutation.isPending}
            >
              {transitionMutation.isPending && pendingTransition === item.transition && (
                <Icons.spinner className='mr-1 h-3 w-3 animate-spin' />
              )}
              {config.label}
            </Button>
          );
        })}
      </div>

      <Dialog open={dialogType === 'reason'} onOpenChange={(open) => { if (!open) setDialogType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {getActionUiConfig(pendingTransition ?? '').label}
            </DialogTitle>
            <DialogDescription>{taskUiCopy.workflow.reasonDescription}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={taskUiCopy.workflow.reasonPlaceholder}
            rows={3}
          />
          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogType(null)}>{commonUiCopy.cancel}</Button>
            <Button onClick={handleDialogConfirm} disabled={transitionMutation.isPending}>
              {transitionMutation.isPending && <Icons.spinner className='mr-1 h-3 w-3 animate-spin' />}
              {commonUiCopy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'result'} onOpenChange={(open) => { if (!open) setDialogType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {getActionUiConfig(pendingTransition ?? '').label}
            </DialogTitle>
            <DialogDescription>{taskUiCopy.workflow.resultDescription}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={resultText}
            onChange={(e) => setResultText(e.target.value)}
            placeholder={taskUiCopy.workflow.resultPlaceholder}
            rows={5}
          />
          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogType(null)}>{commonUiCopy.cancel}</Button>
            <Button onClick={handleDialogConfirm} disabled={transitionMutation.isPending}>
              {transitionMutation.isPending && <Icons.spinner className='mr-1 h-3 w-3 animate-spin' />}
              {taskUiCopy.workflow.submitResult}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === 'assign'} onOpenChange={(open) => { if (!open) setDialogType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{taskUiCopy.workflow.assignTitle}</DialogTitle>
            <DialogDescription>{taskUiCopy.workflow.assignDescription}</DialogDescription>
          </DialogHeader>
          <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                className={cn('w-full justify-between', !assigneeId && 'text-muted-foreground')}
              >
                {assigneeId
                  ? employeeOptions.find((o) => o.value === assigneeId)?.label ?? commonUiCopy.loading
                  : commonUiCopy.selectEmployee}
                <Icons.chevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-full p-0' align='start'>
              <Command shouldFilter={false}>
                <CommandInput placeholder={commonUiCopy.searchByName} />
                <CommandList>
                  <CommandEmpty>{commonUiCopy.noEmployeesFound}</CommandEmpty>
                  <CommandGroup>
                    {employeeOptions.map((opt) => (
                      <CommandItem
                        key={opt.value}
                        value={opt.value}
                        onSelect={(val) => {
                          setAssigneeId(val);
                          setAssigneePopoverOpen(false);
                        }}
                      >
                        <Icons.check className={cn('mr-2 h-4 w-4', assigneeId === opt.value ? 'opacity-100' : 'opacity-0')} />
                        {opt.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogType(null)}>{commonUiCopy.cancel}</Button>
            <Button onClick={handleDialogConfirm} disabled={transitionMutation.isPending || !assigneeId}>
              {transitionMutation.isPending && <Icons.spinner className='mr-1 h-3 w-3 animate-spin' />}
              {taskUiCopy.workflow.assign}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
