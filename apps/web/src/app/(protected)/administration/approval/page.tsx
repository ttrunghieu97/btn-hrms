import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApprovalPoliciesListPage, ApprovalRequestsListPage, ApprovalInboxListPage } from '@/features/approval';
import { buildDashboardMetadataTitle, approvalCopy } from '@/lib/app-copy';
import { requireServerSession } from '@/lib/server/auth-session';

export const metadata = {
  title: buildDashboardMetadataTitle(approvalCopy.management),
  description: approvalCopy.description,
};

export default async function ApprovalAdminPage() {
  await requireServerSession();
  await requireServerSession();
  return (
    <div className="space-y-6">

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">{approvalCopy.inbox}</TabsTrigger>
          <TabsTrigger value="requests">{approvalCopy.requests}</TabsTrigger>
          <TabsTrigger value="policies">{approvalCopy.policies}</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="mt-4">
          <ApprovalInboxListPage />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          <ApprovalRequestsListPage />
        </TabsContent>
        <TabsContent value="policies" className="mt-4">
          <ApprovalPoliciesListPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
