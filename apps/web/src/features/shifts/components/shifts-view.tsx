'use client';

import * as React from 'react';
import { todayDateString } from "@/lib/date";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { parseAsString, useQueryStates } from 'nuqs';
import { AssignmentsTable } from './assignments-table';
import { TemplatesTable } from './templates-table';
import { RosterView } from './roster-view';
import { ScheduleCalendarView } from './schedule-calendar-view';
import { RequirementsEditor } from './requirements-editor';
import { shiftUiCopy } from '@/lib/app-copy';
import type { ShiftAssignmentRow, ShiftTemplateRow } from '../api/queries';

export function ShiftsView() {
  const [params, setParams] = useQueryStates({
    managementTab: parseAsString.withDefault('templates'),
    create: parseAsString,
    detail: parseAsString
  });

  const activeTab = (params.managementTab as 'templates' | 'assignments' | 'roster' | 'schedule' | 'requirements') || 'templates';

  const [selectedTemplate, setSelectedTemplate] = React.useState<ShiftTemplateRow | undefined>(undefined);
  const [selectedAssignment, setSelectedAssignment] = React.useState<ShiftAssignmentRow | undefined>(undefined);
  const [cancelTarget, setCancelTarget] = React.useState<ShiftAssignmentRow | undefined>(undefined);

  function handleCreateClick() {
    setParams({ create: 'true', detail: null }, { shallow: true }).catch(() => undefined);
  }

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setParams({ managementTab: value, create: null, detail: null }, { shallow: true }).catch(() => undefined);
        }}
        className='flex flex-1 flex-col gap-4'
      >
        <div className='flex items-center justify-between gap-4'>
          <TabsList className='w-fit'>
            <TabsTrigger value='templates' className='flex items-center gap-1.5'>
              <Icons.clock className='h-4 w-4' />
              {shiftUiCopy.tabs.templates}
            </TabsTrigger>
            <TabsTrigger value='assignments' className='flex items-center gap-1.5'>
              <Icons.user className='h-4 w-4' />
              {shiftUiCopy.tabs.assignments}
            </TabsTrigger>
            <TabsTrigger value='roster' className='flex items-center gap-1.5'>
              <Icons.calendar className='h-4 w-4' />
              {shiftUiCopy.tabs.roster}
            </TabsTrigger>
            <TabsTrigger value='schedule' className='flex items-center gap-1.5'>
              <Icons.calendar className='h-4 w-4' />
              {shiftUiCopy.tabs.schedule}
            </TabsTrigger>
            <TabsTrigger value='requirements' className='flex items-center gap-1.5'>
              <Icons.people className='h-4 w-4' />
              {shiftUiCopy.tabs.requirements}
            </TabsTrigger>
          </TabsList>

          <Button onClick={handleCreateClick} size='sm' disabled={activeTab === 'roster' || activeTab === 'schedule' || activeTab === 'requirements'}>
            <Icons.add className='mr-1.5 h-4 w-4' />
            {activeTab === 'templates'
              ? shiftUiCopy.tabs.createTemplate
              : activeTab === 'assignments'
                ? shiftUiCopy.tabs.createAssignment
                : shiftUiCopy.tabs.createFromRoster}
          </Button>
        </div>

        <TabsContent value='templates' className='flex flex-1 flex-col'>
          <TemplatesTable
            onEdit={(row) => {
              setSelectedTemplate(row);
              setParams({ detail: row.id, create: null }, { shallow: true }).catch(() => undefined);
            }}
            onArchive={(row) => {
              setSelectedTemplate(row);
              setParams({ detail: row.id, create: null }, { shallow: true }).catch(() => undefined);
            }}
          />
        </TabsContent>

        <TabsContent value='assignments' className='flex flex-1 flex-col'>
          <AssignmentsTable
            onEdit={(row) => {
              setSelectedAssignment(row);
              setParams({ detail: row.id, create: null }, { shallow: true }).catch(() => undefined);
            }}
            onCancel={(row) => setCancelTarget(row)}
          />
        </TabsContent>

        <TabsContent value='roster' className='flex flex-1 flex-col'>
          <RosterView />
        </TabsContent>

        <TabsContent value='schedule' className='flex flex-1 flex-col'>
          <ScheduleCalendarView />
        </TabsContent>
        <TabsContent value='requirements' className='flex flex-1 flex-col'>
          <RequirementsEditor date={todayDateString()} />
        </TabsContent>
      </Tabs>
    </>
  );
}
