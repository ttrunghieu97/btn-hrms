'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface AuditFilterValues {
  search?: string;
  action?: string;
  entity?: string;
  severity?: string;
  period?: string;
}

interface AuditFiltersProps {
  initialValues?: AuditFilterValues;
  onFilter: (filters: AuditFilterValues) => void;
}

export function AuditFilters({ initialValues, onFilter }: AuditFiltersProps) {
  const [search, setSearch] = useState(initialValues?.search ?? '');
  const [action, setAction] = useState(initialValues?.action ?? 'all');
  const [entity, setEntity] = useState(initialValues?.entity ?? 'all');
  const [severity, setSeverity] = useState(initialValues?.severity ?? 'all');
  const [period, setPeriod] = useState(initialValues?.period ?? '7d');

  const handleApply = () => {
    onFilter({
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(action !== 'all' ? { action } : {}),
      ...(entity !== 'all' ? { entity } : {}),
      ...(severity !== 'all' ? { severity } : {}),
      period,
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Search / Actor</label>
        <Input
          placeholder="Search actor, action..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          className="h-8 w-44 text-xs"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Action</label>
        <Select value={action} onValueChange={setAction}>
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
        <Select value={entity} onValueChange={setEntity}>
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
        <Select value={severity} onValueChange={setSeverity}>
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
        <Select value={period} onValueChange={setPeriod}>
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
      <Button size="sm" className="h-8 text-xs" onClick={handleApply}>
        Search
      </Button>
    </div>
  );
}
