'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'approval', label: 'Approvals' },
  { value: 'task', label: 'Tasks' },
  { value: 'system', label: 'System' },
] as const;

export type NotificationFilter = typeof FILTERS[number]['value'];

interface NotificationFiltersProps {
  total: number;
  unreadCount: number;
}

export function NotificationFilters({ total, unreadCount }: NotificationFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get('filter') as NotificationFilter) ?? 'all';

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'all') {
        params.delete('filter');
      } else {
        params.set('filter', value);
      }
      router.replace(`/notifications?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <Tabs value={current} onValueChange={handleChange}>
      <TabsList>
        <TabsTrigger value="all">All ({total})</TabsTrigger>
        <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
        <TabsTrigger value="approval">Approvals</TabsTrigger>
        <TabsTrigger value="task">Tasks</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
