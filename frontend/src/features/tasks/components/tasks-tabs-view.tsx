'use client';

import * as React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { TasksTable } from './tasks-table';
import { DraggableTaskBoard } from './board/draggable-task-board';
import { TaskAnalyticsView } from './task-analytics-view';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/layout/section';
import { taskUiCopy } from '@/lib/app-copy';
import { useTaskLiveUpdates } from '../hooks/use-task-live-updates';
import type { Task } from '../utils/task-types';
import { perPageParser, pageParser } from '@/lib/pagination';

type ViewTab = 'all' | 'mine' | 'kanban' | 'analytics';

export function TasksTabsView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    perPage: perPageParser,
    search: parseAsString,
    status: parseAsString,
    tab: parseAsString,
    sort: parseAsString,
    create: parseAsString,
    detail: parseAsString
  });

  useTaskLiveUpdates();

  const activeTab = (params.tab as ViewTab) || 'all';

  const handleRowClick = React.useCallback((task: Task) => {
    setParams({ detail: task.id, create: null }, { shallow: true }).catch(() => undefined);
  }, [setParams]);

  return (
    <Section>
      <div className='flex flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between gap-4'>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            void setParams({
              page: 1,
              tab: value,
              sort: params.sort ?? null,
              search: params.search ?? null,
              status: params.status ?? null,
              perPage: params.perPage,
              create: null,
              detail: null
            });
          }}
          className='flex flex-1'
        >
          <TabsList className='w-fit'>
            <TabsTrigger value='all' className='flex items-center gap-1.5'>
              <Icons.task className='h-4 w-4' />
              {taskUiCopy.tabs.all}
            </TabsTrigger>
            <TabsTrigger value='mine' className='flex items-center gap-1.5'>
              <Icons.user className='h-4 w-4' />
              {taskUiCopy.tabs.mine}
            </TabsTrigger>
            <TabsTrigger value='kanban' className='flex items-center gap-1.5'>
              <Icons.kanban className='h-4 w-4' />
              {taskUiCopy.tabs.kanban}
            </TabsTrigger>
            <TabsTrigger value='analytics' className='flex items-center gap-1.5'>
              <Icons.trendingUp className='h-4 w-4' />
              {taskUiCopy.tabs.analytics}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={() => setParams({ create: 'true', detail: null }, { shallow: true })}>
          <Icons.add className='mr-2 h-4 w-4' />
          {taskUiCopy.createTask}
        </Button>
      </div>

      {activeTab === 'kanban' ? (
        <DraggableTaskBoard onCardClick={handleRowClick} />
      ) : activeTab === 'analytics' ? (
        <TaskAnalyticsView />
      ) : (
        <TasksTable
          scope={activeTab === 'mine' ? 'mine' : 'all'}
          onRowClick={handleRowClick}
        />
      )}
    </div>
    </Section>
  );
}
