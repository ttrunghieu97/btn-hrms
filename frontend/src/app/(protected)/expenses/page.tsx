import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { ExpenseClaimsView } from '@/features/expenses';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.expenseClaims),
};

export default async function ExpensesPage() {
  await requirePageAccess('expenses:view');
  return <ExpenseClaimsView />;
}
