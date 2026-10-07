'use client';

import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AuditFiltersProps {
  onFilter: (filters: Record<string, string>) => void;
}

export function AuditFilters({ onFilter }: AuditFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">User</label>
        <Input placeholder="Actor name..." className="h-8 w-44 text-xs" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Action</label>
        <Select>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="permission">Permission</SelectItem>
            <SelectItem value="role">Role</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="approval">Approval</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Resource</label>
        <Select>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="All resources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All resources</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="role">Role</SelectItem>
            <SelectItem value="permission">Permission</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Severity</label>
        <Select>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Period</label>
        <Select>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue placeholder="7 days" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24 hours</SelectItem>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" className="h-8 text-xs">Search</Button>
    </div>
  );
}
