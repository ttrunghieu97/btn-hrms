'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { parseAsString, useQueryStates } from 'nuqs';
import { TemplateFormSheet } from './template-form-sheet';
import { AssignmentFormSheet } from './assignment-form-sheet';
import {
  shiftsTemplatesQueryOptions,
  shiftsAssignmentsQueryOptions,
  type ShiftAssignmentRow,
  type ShiftTemplateRow
} from '../api/queries';

export function ShiftsSheetsController() {
  const [params, setParams] = useQueryStates({
    managementTab: parseAsString.withDefault('templates'),
    create: parseAsString,
    detail: parseAsString
  });

  const activeTab = (params.managementTab as 'templates' | 'assignments' | 'roster' | 'schedule' | 'requirements') || 'templates';

  // Fetch data to find selected row objects using queryOptions
  const { data: templatesData } = useQuery(shiftsTemplatesQueryOptions());
  const { data: assignmentsData } = useQuery(shiftsAssignmentsQueryOptions());

  const selectedTemplate = React.useMemo(() => {
    if (activeTab !== 'templates' || !params.detail) return undefined;
    return templatesData?.templates.find((item) => item.id === params.detail);
  }, [templatesData, params.detail, activeTab]);

  const selectedAssignment = React.useMemo(() => {
    if (activeTab !== 'assignments' || !params.detail) return undefined;
    return assignmentsData?.assignments.find((item) => item.id === params.detail);
  }, [assignmentsData, params.detail, activeTab]);

  const [cancelTarget, setCancelTarget] = React.useState<ShiftAssignmentRow | undefined>(undefined);

  const templateSheetOpen = activeTab === 'templates' && (params.create === 'true' || !!params.detail);
  const assignmentSheetOpen = activeTab === 'assignments' && (params.create === 'true' || !!params.detail);

  const handleTemplateClose = React.useCallback((open: boolean) => {
    if (!open) {
      setParams({ create: null, detail: null }, { shallow: true }).catch(() => undefined);
    }
  }, [setParams]);

  const handleAssignmentClose = React.useCallback((open: boolean) => {
    if (!open) {
      setParams({ create: null, detail: null }, { shallow: true }).catch(() => undefined);
    }
  }, [setParams]);

  return (
    <>
      <TemplateFormSheet
        key={selectedTemplate?.id ?? 'new-template'}
        template={selectedTemplate}
        open={templateSheetOpen}
        onOpenChange={handleTemplateClose}
      />

      <AssignmentFormSheet
        key={selectedAssignment?.id ?? 'new-assignment'}
        assignment={selectedAssignment}
        open={assignmentSheetOpen}
        onOpenChange={handleAssignmentClose}
        cancelTarget={cancelTarget}
        onCancelTargetChange={setCancelTarget}
      />
    </>
  );
}
