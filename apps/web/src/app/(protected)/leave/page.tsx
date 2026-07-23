import { redirect } from 'next/navigation';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';

export const metadata = {
  title: buildDashboardMetadataTitle('Nghỉ phép'),
};

export default function LeavePage() {
  redirect('/leave/requests');
}
