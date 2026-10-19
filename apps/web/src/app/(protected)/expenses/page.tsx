import { DomainHeader } from '@/components/layout/domain-header';
import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { ExpenseClaimsView } from '@/features/expenses';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.expenseClaims),
};

export default async function ExpensesPage() {
  await requireServerSession();
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DomainHeader title={routeLabels.expenseClaims} />
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>
        <ExpenseClaimsView />
      </div>
    </div>
  );
}
