'use client';

import { StatusCard } from '@/components/platform';

interface LeaveBalanceData {
  annual: { used: number; total: number };
  sick: { used: number; total: number };
  personal?: { used: number; total: number };
}

interface LeaveBalanceCardProps {
  balance: LeaveBalanceData;
}

/**
 * Leave balance overview card.
 * Uses StatusCard from platform primitives.
 */
export function LeaveBalanceCard({ balance }: LeaveBalanceCardProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatusCard
        title="Annual Leave"
        value={`${balance.annual.total - balance.annual.used} days remaining`}
        variant={balance.annual.total - balance.annual.used <= 2 ? 'warning' : 'info'}
        subtitle={`${balance.annual.used} used of ${balance.annual.total}`}
      />
      <StatusCard
        title="Sick Leave"
        value={`${balance.sick.total - balance.sick.used} days remaining`}
        variant="neutral"
        subtitle={`${balance.sick.used} used of ${balance.sick.total}`}
      />
      {balance.personal && (
        <StatusCard
          title="Personal Leave"
          value={`${balance.personal.total - balance.personal.used} days remaining`}
          variant="neutral"
          subtitle={`${balance.personal.used} used of ${balance.personal.total}`}
        />
      )}
    </div>
  );
}
