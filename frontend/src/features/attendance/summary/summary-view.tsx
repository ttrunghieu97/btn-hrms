'use client';

import { Section } from '@/components/layout/section';
import { attendanceUiCopy } from '@/lib/app-copy';
import { TimekeepingView } from '../components/timekeeping-view';

export function SummaryView() {
  return (
    <Section>
      <TimekeepingView />
    </Section>
  );
}
