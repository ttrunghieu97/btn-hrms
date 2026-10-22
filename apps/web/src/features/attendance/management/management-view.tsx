'use client';

import { TimesheetEditorPage } from '../timesheet-editor/timesheet-editor-page';

export function ManagementView() {
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return <TimesheetEditorPage defaultPeriod={currentPeriod} />;
}
