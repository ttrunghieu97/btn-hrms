import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { ExpenseClaimsView } from '@/features/expenses';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.expenseClaims),
};

export default async function ExpensesPage() {
  await requireServerSession();
  return <ExpenseClaimsView />;
}
