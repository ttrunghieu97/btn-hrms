import { buildDashboardMetadataTitle, routeLabels, pageCopy } from '@/lib/app-copy';
import { DomainHeader } from '@/components/layout/domain-header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: buildDashboardMetadataTitle(routeLabels.account),
  description: pageCopy.dashboard.account.description
};

const tabs = [
  { href: '/account/profile', label: routeLabels.profile },
  { href: '/account/change-password', label: routeLabels.changePassword },
  { href: '/account/notifications', label: routeLabels.notifications }
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader tabs={tabs} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>{children}</div>
    </div>
  );
}
