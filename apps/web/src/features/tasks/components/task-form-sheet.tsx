'use client';

import * as React from 'react';
import { formatDateForInput } from "@/lib/date";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { commonUiCopy, taskUiCopy } from '@/lib/app-copy';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import { getQueryClient } from '@/lib/query-client';
import { cn } from '@/lib/utils';
import type { Task } from '../utils/task-types';
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useTasksQuery
} from '../queries/task-queries';
import { useQuery } from '@tanstack/react-query';
import { employeesQueryOptions } from '@/features/employees';
import { TASK_PRIORITY_MAP, TASK_STATUS_MAP } from '../utils/task-status';

interface TaskFormSheetProps {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChecklistItem {
  text: string;
  done?: boolean;
}

interface FormValues {
  title: string;
  description: string;
  status: string;
  priority: string;
  startedAt: string;
  dueDate: string;
  assigneeId: string;
  parentTaskId: string;
  checklist: ChecklistItem[];
}

function createEmptyForm(): FormValues {
  return {
    title: '',
    description: '',
    status: 'created',
    priority: 'medium',
    startedAt: '',
    dueDate: '',
    assigneeId: '',
    parentTaskId: '',
    checklist: []
  };
}

function formFromTask(task: Task): FormValues {
  let parsedChecklist: ChecklistItem[] = [];
  if (task.checklist) {
    try {
      parsedChecklist = typeof task.checklist === 'string'
        ? JSON.parse(task.checklist)
        : task.checklist;
    } catch {
      parsedChecklist = [];
    }
  }

  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status ?? 'created',
    priority: task.priority ?? 'medium',
    startedAt: task.startedAt
      ? formatDateForInput(task.startedAt)
      : '',
    dueDate: task.dueDate
      ? formatDateForInput(task.dueDate)
      : '',
    assigneeId: task.assigneeId ?? '',
    parentTaskId: task.parentTaskId ?? '',
    checklist: parsedChecklist
  };
}

function getInitials(name: string) {
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function TaskFormSheet({ task, open, onOpenChange }: TaskFormSheetProps) {
  const isEdit = !!task;
  const queryClient = getQueryClient();

  const [form, setForm] = React.useState<FormValues>(createEmptyForm);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [assigneeOpen, setAssigneeOpen] = React.useState(false);
  const [parentOpen, setParentOpen] = React.useState(false);
  const [newCheckItemText, setNewCheckItemText] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setForm(task ? formFromTask(task) : createEmptyForm());
    setErrors({});
    setNewCheckItemText('');
  }, [open, task]);

  const createMutation = useCreateTaskMutation(queryClient);
  const updateMutation = useUpdateTaskMutation(queryClient);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const employeesQuery = useQuery(employeesQueryOptions({ limit: 500 }));
  const rawEmployees = employeesQuery.data?.employees ?? [];
  const employeeOptions = React.useMemo(() => {
    return rawEmployees.map((emp) => ({
      value: emp.id,
      fullName: `${emp.firstName} ${emp.lastName}`.trim(),
      avatarUrl: emp.avatar?.url,
      departmentName: emp.department?.name,
      employeeCode: emp.employeeCode,
    }));
  }, [rawEmployees]);

  const { data: tasksList } = useTasksQuery({ limit: 200 });
  const rawTasks = tasksList?.tasks ?? [];

  const parentTaskOptions = React.useMemo(() => {
    return (rawTasks as Task[])
      .filter((t) => {
        if (isEdit && task && t.id === task.id) return false; // Can't select self as parent
        if (t.parentTaskId) return false; // Prevent nesting subtasks more than 1 level deep
        return true;
      })
      .map((t) => ({
        value: t.id,
        title: t.title,
      }));
  }, [rawTasks, isEdit, task]);

  const selectedEmployee = employeeOptions.find((o) => o.value === form.assigneeId);
  const selectedParentTask = parentTaskOptions.find((t) => t.value === form.parentTaskId);

  function handleSave() {
    const nextErrors: Record<string, string> = {};

    if (!form.title.trim()) {
      nextErrors.title = taskUiCopy.form.titleRequired;
    }

    if (form.startedAt && form.dueDate) {
      if (new Date(form.startedAt) > new Date(form.dueDate)) {
        nextErrors.dueDate = 'Hạn chót không được trước ngày bắt đầu';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority as 'low' | 'medium' | 'high' | 'urgent',
      dueDate: form.dueDate || undefined,
      startedAt: form.startedAt || undefined,
      checklist: form.checklist,
      ...(!isEdit && {
        assigneeId: form.assigneeId || undefined,
        parentTaskId: form.parentTaskId || undefined
      })
    };

    if (isEdit && task) {
      updateMutation.mutate(
        {
          id: task.id,
          patch: payload
        },
        {
          onSuccess: () => {
            toast.success(feedbackCopy.success.updated(feedbackEntity.task));
            onOpenChange(false);
          },
          onError: () => toast.error(feedbackCopy.failure.update(feedbackEntity.task))
        }
      );
    } else {
      createMutation.mutate(
        payload,
        {
          onSuccess: () => {
            toast.success(feedbackCopy.success.created(feedbackEntity.task));
            onOpenChange(false);
          },
          onError: () => toast.error(feedbackCopy.failure.create(feedbackEntity.task))
        }
      );
    }
  }

  function handleAddChecklistItem(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const text = newCheckItemText.trim();
    if (!text) return;
    
    setForm((f) => ({
      ...f,
      checklist: [...f.checklist, { text, done: false }]
    }));
    setNewCheckItemText('');
  }

  function handleToggleChecklistItem(index: number, checked: boolean) {
    setForm((f) => {
      const nextList = [...f.checklist];
      nextList[index] = { ...nextList[index], done: checked };
      return { ...f, checklist: nextList };
    });
  }

  function handleRemoveChecklistItem(index: number) {
    setForm((f) => ({
      ...f,
      checklist: f.checklist.filter((_, i) => i !== index)
    }));
  }

  // Priority Dot Color Helpers
  const priorityDotColors: Record<string, string> = {
    low: 'bg-emerald-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500'
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-muted/10">
          <SheetTitle className="text-lg font-bold flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Icons.task className="size-4" />
            </span>
            {isEdit ? taskUiCopy.form.editTitle : taskUiCopy.form.createTitle}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="task-title" className="font-semibold text-sm">
                {taskUiCopy.form.titleLabel} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task-title"
                value={form.title}
                onChange={(e) => {
                  setForm((f) => ({ ...f, title: e.target.value }));
                  setErrors((prev) => {
                    const { title: _, ...rest } = prev;
                    return rest;
                  });
                }}
                placeholder={taskUiCopy.form.titlePlaceholder}
                disabled={isPending}
                className={cn('h-10 text-sm font-medium', errors.title && 'border-destructive focus-visible:ring-destructive')}
              />
              {errors.title && (
                <span className="text-destructive text-xs flex items-center gap-1 font-medium">
                  ⚠️ {errors.title}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="task-desc" className="font-semibold text-sm">
                {taskUiCopy.form.descriptionLabel}
              </Label>
              <Textarea
                id="task-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={taskUiCopy.form.descriptionPlaceholder}
                rows={4}
                className="resize-none text-sm"
                disabled={isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               {/* Status Select */}
              <div className="grid gap-2">
                <Label className="font-semibold text-sm">{taskUiCopy.form.statusLabel}</Label>
                {isEdit ? (
                  <div className="h-10 flex items-center">
                    <span className={cn('px-2.5 py-1 rounded text-xs font-semibold border', TASK_STATUS_MAP[form.status as keyof typeof TASK_STATUS_MAP]?.className)}>
                      {TASK_STATUS_MAP[form.status as keyof typeof TASK_STATUS_MAP]?.label ?? form.status}
                    </span>
                  </div>
                ) : (
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_STATUS_MAP).map(([key, config]) => (
                        <SelectItem key={key} value={key} className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className={cn('px-2 py-0.5 rounded text-xs font-semibold border', config.className)}>
                              {config.label}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Priority Select */}
              <div className="grid gap-2">
                <Label className="font-semibold text-sm">{taskUiCopy.form.priorityLabel}</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_PRIORITY_MAP).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="cursor-pointer">
                        <div className="flex items-center gap-2 font-medium">
                          <span className={cn('size-2.5 rounded-full shrink-0', priorityDotColors[key] || 'bg-slate-400')} />
                          <span className={cn('text-sm', config.className)}>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timeline: Start Date & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="task-start" className="font-semibold text-sm">{taskUiCopy.form.startDateLabel}</Label>
                <Input
                  id="task-start"
                  type="date"
                  value={form.startedAt}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, startedAt: e.target.value }));
                    setErrors((prev) => {
                      const { dueDate: _, ...rest } = prev;
                      return rest;
                    });
                  }}
                  disabled={isPending}
                  className="h-10"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="task-due" className="font-semibold text-sm">{taskUiCopy.form.dueDateLabelWithPlanned}</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, dueDate: e.target.value }));
                    setErrors((prev) => {
                      const { dueDate: _, ...rest } = prev;
                      return rest;
                    });
                  }}
                  disabled={isPending}
                  className={cn('h-10', errors.dueDate && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.dueDate && (
                  <span className="text-destructive text-xs flex items-center gap-1 font-medium">
                    ⚠️ {errors.dueDate}
                  </span>
                )}
              </div>
            </div>

            {/* Assignee Search */}
            <div className="grid gap-2">
              <Label className="font-semibold text-sm">{taskUiCopy.form.assigneeLabel}</Label>
              {isEdit ? (
                <div className="h-10 flex items-center gap-2 border rounded-md px-3 bg-muted/20">
                  {selectedEmployee ? (
                    <>
                      <Avatar className="size-6">
                        <AvatarImage src={selectedEmployee.avatarUrl ?? undefined} alt={selectedEmployee.fullName} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                          {getInitials(selectedEmployee.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-semibold text-foreground">{selectedEmployee.fullName}</span>
                      {selectedEmployee.departmentName && (
                        <span className="text-xs text-muted-foreground">({selectedEmployee.departmentName})</span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">{taskUiCopy.form.unassigned}</span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto italic">{taskUiCopy.form.assigneeWorkflowHint}</span>
                </div>
              ) : (
                <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-between h-10 px-3', !form.assigneeId && 'text-muted-foreground')}
                      disabled={isPending}
                    >
                      {selectedEmployee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6">
                            <AvatarImage src={selectedEmployee.avatarUrl ?? undefined} alt={selectedEmployee.fullName} />
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                              {getInitials(selectedEmployee.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{selectedEmployee.fullName}</span>
                          {selectedEmployee.departmentName && (
                            <span className="text-xs text-muted-foreground">({selectedEmployee.departmentName})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm">{commonUiCopy.selectEmployee}</span>
                      )}
                      <Icons.chevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-55" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={commonUiCopy.searchByName} className="h-10 text-sm" />
                      <CommandList className="max-h-[220px]">
                        <CommandEmpty>{commonUiCopy.noEmployeesFound}</CommandEmpty>
                        <CommandGroup>
                          {employeeOptions.map((opt) => (
                            <CommandItem
                               key={opt.value}
                               value={opt.fullName}
                               onSelect={() => {
                                 setForm((f) => ({ ...f, assigneeId: opt.value === form.assigneeId ? '' : opt.value }));
                                 setAssigneeOpen(false);
                               }}
                               className="cursor-pointer py-2 px-3 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5">
                                <Avatar className="size-6">
                                  <AvatarImage src={opt.avatarUrl ?? undefined} alt={opt.fullName} />
                                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                                    {getInitials(opt.fullName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{opt.fullName}</span>
                                  {opt.departmentName && (
                                    <span className="text-[10px] text-muted-foreground">{opt.departmentName}</span>
                                  )}
                                </div>
                              </div>
                              <Icons.check className={cn('h-4 w-4 text-primary', form.assigneeId === opt.value ? 'opacity-100' : 'opacity-0')} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Parent Task Search (WBS - Subtasks Support) - Hide on edit since parentTaskId is set on creation */}
            {!isEdit && (
              <div className="grid gap-2">
                <Label className="font-semibold text-sm">{taskUiCopy.form.parentTaskLabel}</Label>
                <Popover open={parentOpen} onOpenChange={setParentOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-between h-10 px-3', !form.parentTaskId && 'text-muted-foreground')}
                      disabled={isPending}
                    >
                      {selectedParentTask ? (
                        <span className="text-sm font-medium text-foreground">{selectedParentTask.title}</span>
                      ) : (
                        <span className="text-sm">{taskUiCopy.form.selectParentTaskPlaceholder}</span>
                      )}
                      <Icons.chevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-55" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={taskUiCopy.form.searchParentTaskPlaceholder} className="h-10 text-sm" />
                      <CommandList className="max-h-[220px]">
                        <CommandEmpty>{taskUiCopy.form.noParentTaskFound}</CommandEmpty>
                        <CommandGroup>
                          {parentTaskOptions.map((opt) => (
                            <CommandItem
                              key={opt.value}
                              value={opt.title}
                              onSelect={() => {
                                setForm((f) => ({ ...f, parentTaskId: opt.value === form.parentTaskId ? '' : opt.value }));
                                setParentOpen(false);
                              }}
                              className="cursor-pointer py-2 px-3 flex items-center justify-between"
                            >
                              <span className="text-sm font-medium">{opt.title}</span>
                              <Icons.check className={cn('h-4 w-4 text-primary', form.parentTaskId === opt.value ? 'opacity-100' : 'opacity-0')} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <Separator />

            {/* Checklist Draft Manager */}
            <div className="space-y-3">
              <Label className="font-semibold text-sm">{taskUiCopy.form.checklistLabel}</Label>
              <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                <Input
                  value={newCheckItemText}
                  onChange={(e) => setNewCheckItemText(e.target.value)}
                  placeholder={taskUiCopy.form.checklistInputPlaceholder}
                  className="h-10 text-sm"
                  disabled={isPending}
                />
                <Button type="submit" variant="secondary" className="h-10 px-3 cursor-pointer" disabled={isPending || !newCheckItemText.trim()}>
                  <Icons.add className="size-4 mr-1" /> {taskUiCopy.form.checklistAddBtn}
                </Button>
              </form>

              {form.checklist.length > 0 ? (
                <div className="border rounded-xl p-3 bg-muted/5 space-y-2.5 max-h-[200px] overflow-y-auto">
                  {form.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 group py-0.5">
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          id={`chk-${idx}`}
                          checked={item.done}
                          onCheckedChange={(checked) => handleToggleChecklistItem(idx, !!checked)}
                          disabled={isPending}
                          className="size-4"
                        />
                        <label
                          htmlFor={`chk-${idx}`}
                          className={cn('text-sm font-medium leading-none cursor-pointer', item.done && 'line-through text-muted-foreground')}
                        >
                          {item.text}
                        </label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                        onClick={() => handleRemoveChecklistItem(idx)}
                        disabled={isPending}
                      >
                        <Icons.trash className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed rounded-xl bg-muted/5">
                  <span className="text-xs text-muted-foreground">{taskUiCopy.form.noChecklistItems}</span>
                </div>
              )}
            </div>

          </div>
        </div>

        <SheetFooter className="border-t px-6 py-4 bg-muted/5">
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenChange(false);
              }}
              disabled={isPending}
              className="h-10"
            >
              {commonUiCopy.cancel}
            </Button>
            <Button onClick={handleSave} disabled={isPending} className="h-10 px-5">
              {isPending ? (
                <Icons.spinner className="mr-2 size-4 animate-spin" />
              ) : (
                <Icons.check className="mr-2 size-4" />
              )}
              {isEdit ? commonUiCopy.saveChanges : taskUiCopy.form.createTitle}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
