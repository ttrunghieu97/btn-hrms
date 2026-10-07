'use client';

import * as React from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Icons } from '@/components/icons';
import { taskUiCopy } from '@/lib/app-copy';
import { useTaskAnalyticsQuery, useTaskPerformanceQuery } from '../queries/task-queries';
import { TASK_STATUS_MAP } from '../utils/task-status';

interface AnalyticsData {
  statusDistribution: { status: string; count: number }[];
  priorityDistribution: { priority: string; count: number }[];
  overdueCount: number;
  slaBreachCount: number;
  totalCount: number;
  completionRate: number;
}

interface PerformanceItem {
  assigneeId: string;
  employeeCode: string | null;
  assigneeName: string;
  departmentName: string;
  totalAssigned: number;
  completedCount: number;
  activeCount: number;
  overdueCount: number;
  onTimeCompletedCount: number;
  completionRate: number;
  onTimeCompletionRate: number;
  avgCompletionHours: number;
}

interface PerformanceData {
  items: PerformanceItem[];
  summary: {
    totalAssignees: number;
    totalAssigned: number;
    completedCount: number;
    activeCount: number;
    overdueCount: number;
    completionRate: number;
    avgCompletionHours: number;
  };
}

const PRIORITY_LABELS: Record<string, string> = {
  low: taskUiCopy.table.priorityLow,
  medium: taskUiCopy.table.priorityMedium,
  high: taskUiCopy.table.priorityHigh,
  urgent: taskUiCopy.table.priorityUrgent
};

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

const statusChartConfig: ChartConfig = {
  count: { label: taskUiCopy.analytics.chartCountLabel }
};

const priorityChartConfig: ChartConfig = {
  count: { label: taskUiCopy.analytics.chartCountLabel }
};

function StatCard({ title, value, sub, icon }: { title: string; value: string | number; sub?: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        {sub && <p className='text-muted-foreground text-xs'>{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function TaskAnalyticsView() {
  const analyticsQuery = useTaskAnalyticsQuery({});
  const performanceQuery = useTaskPerformanceQuery({});

  const analytics = analyticsQuery.data as unknown as AnalyticsData | undefined;
  const performance = performanceQuery.data as unknown as PerformanceData | undefined;

  if (analyticsQuery.isLoading || performanceQuery.isLoading) {
    return (
      <div className='flex items-center gap-4 p-8'>
        <Icons.spinner className='h-5 w-5 animate-spin' />
        <span className='text-muted-foreground text-sm'>{taskUiCopy.analytics.loading}</span>
      </div>
    );
  }

  const statusMap = TASK_STATUS_MAP as Record<string, { label: string }>;
  const statusData = (analytics?.statusDistribution ?? []).map((s) => ({
    name: statusMap[s.status]?.label ?? s.status,
    count: Number(s.count)
  }));

  const priorityData = (analytics?.priorityDistribution ?? []).map((p) => ({
    name: PRIORITY_LABELS[p.priority] ?? p.priority,
    count: Number(p.count)
  }));

  const performanceItems = performance?.items ?? [];

  return (
    <div className='space-y-6'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          title={taskUiCopy.analytics.totalTasks}
          value={analytics?.totalCount ?? 0}
          icon={<Icons.task className='text-muted-foreground h-4 w-4' />}
        />
        <StatCard
          title={taskUiCopy.analytics.completionRate}
          value={`${(analytics?.completionRate ?? 0).toFixed(1)}%`}
          icon={<Icons.check className='text-muted-foreground h-4 w-4' />}
        />
        <StatCard
          title={taskUiCopy.analytics.overdue}
          value={analytics?.overdueCount ?? 0}
          sub={
            analytics?.totalCount
              ? taskUiCopy.analytics.totalSuffix(
                  `${((analytics.overdueCount / analytics.totalCount) * 100).toFixed(1)}%`
                )
              : undefined
          }
          icon={<Icons.warning className='text-muted-foreground h-4 w-4' />}
        />
        <StatCard
          title={taskUiCopy.analytics.slaBreach}
          value={analytics?.slaBreachCount ?? 0}
          icon={<Icons.close className='text-muted-foreground h-4 w-4' />}
        />
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>{taskUiCopy.analytics.statusDistribution}</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ChartContainer config={statusChartConfig} className='h-[300px] w-full'>
                <BarChart data={statusData} layout='vertical'>
                  <XAxis type='number' hide />
                  <YAxis type='category' dataKey='name' width={120} tickLine={false} axisLine={false} className='text-xs' />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey='count' fill='var(--chart-1)' radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className='text-muted-foreground text-sm'>{taskUiCopy.analytics.noData}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>{taskUiCopy.analytics.priorityDistribution}</CardTitle>
          </CardHeader>
          <CardContent>
            {priorityData.length > 0 ? (
              <ChartContainer config={priorityChartConfig} className='mx-auto h-[300px] w-full'>
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={priorityData} dataKey='count' nameKey='name' cx='50%' cy='50%' outerRadius={100} label>
                    {priorityData.map((_entry, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className='text-muted-foreground text-sm'>{taskUiCopy.analytics.noData}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {performanceItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>{taskUiCopy.analytics.employeePerformance}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b text-left'>
                    <th className='pb-2 pr-4 font-medium'>{taskUiCopy.analytics.employeeLabel}</th>
                    <th className='pb-2 pr-4 font-medium'>{taskUiCopy.analytics.departmentLabel}</th>
                    <th className='pb-2 pr-4 text-right font-medium'>{taskUiCopy.analytics.assignedLabel}</th>
                    <th className='pb-2 pr-4 text-right font-medium'>{taskUiCopy.analytics.completedLabel}</th>
                    <th className='pb-2 pr-4 text-right font-medium'>{taskUiCopy.analytics.activeLabel}</th>
                    <th className='pb-2 pr-4 text-right font-medium'>{taskUiCopy.analytics.overdueLabel}</th>
                    <th className='pb-2 pr-4 text-right font-medium'>{taskUiCopy.analytics.completionRateLabel}</th>
                    <th className='pb-2 text-right font-medium'>{taskUiCopy.analytics.averageCompletionHoursLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceItems.map((item) => (
                    <tr key={item.assigneeId} className='border-b last:border-0'>
                      <td className='py-2 pr-4'>
                        <div className='font-medium'>{item.assigneeName}</div>
                        {item.employeeCode && (
                          <div className='text-muted-foreground text-xs'>{item.employeeCode}</div>
                        )}
                      </td>
                      <td className='py-2 pr-4 text-xs'>{item.departmentName}</td>
                      <td className='py-2 pr-4 text-right tabular-nums'>{item.totalAssigned}</td>
                      <td className='py-2 pr-4 text-right tabular-nums'>{item.completedCount}</td>
                      <td className='py-2 pr-4 text-right tabular-nums'>{item.activeCount}</td>
                      <td className='py-2 pr-4 text-right tabular-nums'>{item.overdueCount > 0 ? <span className='text-red-600'>{item.overdueCount}</span> : 0}</td>
                      <td className='py-2 pr-4 text-right tabular-nums'>{item.completionRate.toFixed(1)}%</td>
                      <td className='py-2 text-right tabular-nums'>{item.avgCompletionHours.toFixed(1)}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
