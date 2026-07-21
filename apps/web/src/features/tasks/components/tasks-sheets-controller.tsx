'use client';

import * as React from 'react';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { TaskFormSheet } from './task-form-sheet';
import { TaskDetailSheet } from './task-detail-sheet';
import type { Task } from '../utils/task-types';
import { perPageParser, pageParser } from '@/lib/pagination';

export function TasksSheetsController() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    perPage: perPageParser,
    search: parseAsString,
    status: parseAsString,
    tab: parseAsString,
    detail: parseAsString,
    create: parseAsString
  });
  const [editTask, setEditTask] = React.useState<Task | null>(null);

  const createOpen = params.create === 'true';
  const detailOpen = !!params.detail;

  const handleCreateClose = React.useCallback((open: boolean) => {
    if (!open) {
      setParams({ create: null }, { shallow: true }).catch(() => undefined);
    }
  }, [setParams]);

  const handleDetailClose = React.useCallback((open: boolean) => {
    if (!open) {
      setParams({ detail: null }, { shallow: true }).catch(() => undefined);
    }
  }, [setParams]);

  return (
    <>
      <TaskFormSheet
        open={createOpen}
        onOpenChange={handleCreateClose}
      />

      <TaskDetailSheet
        taskId={params.detail}
        open={detailOpen}
        onOpenChange={handleDetailClose}
        onEdit={(task) => setEditTask(task)}
      />

      <TaskFormSheet
        task={editTask}
        open={!!editTask}
        onOpenChange={(open) => { if (!open) setEditTask(null); }}
      />
    </>
  );
}
