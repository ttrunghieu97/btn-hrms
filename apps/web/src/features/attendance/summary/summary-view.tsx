'use client';

import { Section } from '@/components/layout/section';
import { attendanceUiCopy } from '@/lib/app-copy';
import { TimekeepingView } from '../timekeeping';

export function SummaryView() {
  return (
    <Section>
      <TimekeepingView />
    </Section>
  );
}
