'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RoleSummary {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  permissionCount: number;
  isSystem?: boolean;
}

interface RoleSummaryCardProps {
  roles: RoleSummary[];
  isLoading?: boolean;
}

export function RoleSummaryCard({ roles, isLoading }: RoleSummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Roles Overview</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Roles Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {roles.map((role) => (
          <Link
            key={role.id}
            href={`/administration/roles/${role.id}`}
            className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{role.name}</span>
                {role.isSystem && (
                  <Badge variant="secondary" className="text-[10px]">System</Badge>
                )}
              </div>
              {role.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{role.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-4">
              <span>{role.memberCount} members</span>
              <span>{role.permissionCount} permissions</span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
