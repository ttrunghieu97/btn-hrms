'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { WorkflowStatusBadge } from '@/components/platform';

interface PendingApproval {
  id: string;
  type: 'leave' | 'expense' | 'recruitment' | 'asset';
  title: string;
  requester: { id: string; name: string };
  createdAt: string;
  status: string;
  summary?: string;
}

interface ManagerApprovalInboxProps {
  approvals: PendingApproval[];
  isLoading?: boolean;
  onApprove: (id: string, comment?: string) => void;
  onReject: (id: string, comment?: string) => void;
}

const typeLabels: Record<string, string> = {
  leave: 'Leave',
  expense: 'Expense',
  recruitment: 'Recruitment',
  asset: 'Asset',
};

function ApprovalCard({
  approval,
  onApprove,
  onReject,
}: {
  approval: PendingApproval;
  onApprove: (id: string, comment?: string) => void;
  onReject: (id: string, comment?: string) => void;
}) {
  const [comment, setComment] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleConfirm = () => {
    if (action === 'approve') onApprove(approval.id, comment);
    if (action === 'reject') onReject(approval.id, comment);
    setDialogOpen(false);
    setComment('');
    setAction(null);
  };

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="text-xs">
          {approval.requester.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{approval.title}</span>
          <Badge variant="outline" className="text-[10px]">
            {typeLabels[approval.type] ?? approval.type}
          </Badge>
          <WorkflowStatusBadge status={approval.status as any} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {approval.requester.name}
          {approval.summary && ` — ${approval.summary}`}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <div className="flex gap-1">
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setAction('approve'); setDialogOpen(true); }}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-red-600 hover:text-red-700"
                onClick={() => { setAction('reject'); setDialogOpen(true); }}
              >
                Reject
              </Button>
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {action === 'approve' ? 'Approve' : 'Reject'} Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {approval.title} — {approval.requester.name}
              </p>
              <Textarea
                placeholder="Add a comment (optional)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant={action === 'approve' ? 'default' : 'destructive'}
                  onClick={handleConfirm}
                >
                  {action === 'approve' ? 'Approve' : 'Reject'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export function ManagerApprovalInbox({ approvals, isLoading, onApprove, onReject }: ManagerApprovalInboxProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Approval Inbox</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (approvals.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Approval Inbox</CardTitle></CardHeader>
        <CardContent>
          <AppEmptyState title="All clear" description="No pending approvals." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Approval Inbox</h2>
        <Badge variant="secondary">{approvals.length} pending</Badge>
      </div>
      <div className="space-y-2">
        {approvals.map((approval) => (
          <ApprovalCard
            key={approval.id}
            approval={approval}
            onApprove={onApprove}
            onReject={onReject}
          />
        ))}
      </div>
    </div>
  );
}
