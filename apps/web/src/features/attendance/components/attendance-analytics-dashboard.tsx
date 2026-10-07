'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { useAttendanceStatsQuery } from '../queries/dashboard-stats-queries';
import type { AttendanceStatsResponseDto } from '../queries/dashboard-stats-queries';
import { attendanceUiCopy } from '@/lib/app-copy';

const trendConfig = {
  present: { label: 'Có mặt', color: 'var(--chart-2)' },
  absent: { label: 'Vắng', color: 'var(--chart-1)' },
  late: { label: 'Đi muộn', color: 'var(--chart-4)' },
} satisfies ChartConfig;

const deptConfig = {
  rate: { label: 'Tỉ lệ', color: 'var(--chart-3)' },
} satisfies ChartConfig;

function formatNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat('en-US').format(Number.isFinite(numeric) ? numeric : 0);
}

function formatHours(value: number) {
  return `${(value / 60).toFixed(1)}h`;
}

function AnalyticsSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className='h-36 w-full rounded-2xl' />
        ))}
      </div>
      <Skeleton className='h-80 w-full rounded-2xl' />
      <Skeleton className='h-80 w-full rounded-2xl' />
    </div>
  );
}

function KpiStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className='border-border/60 bg-card/80 overflow-hidden rounded-2xl backdrop-blur-sm'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardDescription>{title}</CardDescription>
          <Icon className='text-muted-foreground size-5' />
        </div>
        <CardTitle className='text-3xl'>{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-muted-foreground text-sm'>{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function DailyTrendChart({ data }: { data: AttendanceStatsResponseDto['dailyTrend'] }) {
  return (
    <Card className='rounded-3xl'>
      <CardHeader>
        <CardDescription>{attendanceUiCopy.analytics.dailyTrendDescription}</CardDescription>
        <CardTitle>{attendanceUiCopy.analytics.dailyTrendTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={trendConfig} className='h-[320px] w-full'>
          <AreaChart accessibilityLayer data={data}>
            <defs>
              {(['present', 'absent', 'late'] as const).map((k) => (
                <linearGradient key={k} id={`attdash-${k}`} x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor={trendConfig[k].color} stopOpacity={0.35} />
                  <stop offset='95%' stopColor={trendConfig[k].color} stopOpacity={0.03} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey='date' tickLine={false} axisLine={false} tickFormatter={(v: string) => v.slice(8)} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {(['present', 'absent', 'late'] as const).map((k) => (
              <Area
                key={k}
                type='monotone'
                dataKey={k}
                stroke={trendConfig[k].color}
                fill={`url(#attdash-${k})`}
                strokeWidth={2}
                stackId='1'
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function DepartmentBarChart({ data }: { data: AttendanceStatsResponseDto['departmentRates'] }) {
  return (
    <Card className='rounded-3xl'>
      <CardHeader>
        <CardDescription>{attendanceUiCopy.analytics.deptBarDescription}</CardDescription>
        <CardTitle>{attendanceUiCopy.analytics.deptBarTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={deptConfig} className='h-[320px] w-full'>
          <BarChart accessibilityLayer data={data} layout='vertical'>
            <CartesianGrid horizontal={false} />
            <XAxis type='number' tickLine={false} axisLine={false} domain={[0, 100]} />
            <YAxis
              type='category'
              dataKey='departmentName'
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey='attendanceRate' fill='var(--color-rate)' radius={[0, 10, 10, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function ExceptionSummaryCards({ data }: { data: AttendanceStatsResponseDto['exceptionSummary'] }) {
  const exceptionConfig = {
    pending: { label: 'Chờ xử lý', color: 'var(--chart-4)' },
    resolved: { label: 'Đã xử lý', color: 'var(--chart-2)' },
  } satisfies ChartConfig;

  const hasData = data.length > 0 && data.some((e) => e.count > 0);

  return (
    <Card className='rounded-3xl'>
      <CardHeader>
        <CardDescription>{attendanceUiCopy.analytics.exceptionDescription}</CardDescription>
        <CardTitle>{attendanceUiCopy.analytics.exceptionTitle}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {!hasData ? (
          <p className='text-muted-foreground text-sm'>{attendanceUiCopy.analytics.noException}</p>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2'>
            {data.map((e) => (
              <div key={e.type} className='rounded-2xl border p-4'>
                <div className='text-muted-foreground mb-2 text-xs uppercase'>{e.type}</div>
                <div className='mb-3 text-2xl font-semibold'>{formatNumber(e.count)}</div>
                <div className='flex gap-3 text-sm'>
                  <span className='text-amber-600'>{attendanceUiCopy.analytics.exceptionPending(e.pending)}</span>
                  <span className='text-emerald-600'>{attendanceUiCopy.analytics.exceptionResolved(e.resolved)}</span>
                </div>
                {(e.pending > 0 || e.resolved > 0) && (
                  <Progress
                    value={e.count > 0 ? Math.round((e.resolved / e.count) * 100) : 0}
                    className='mt-2 h-1.5'
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OvertimeBreakdown({ data }: { data: AttendanceStatsResponseDto['overtimeBreakdown'] }) {
  return (
    <Card className='rounded-3xl'>
      <CardHeader>
        <CardDescription>{attendanceUiCopy.analytics.overtimeDescription}</CardDescription>
        <CardTitle>{attendanceUiCopy.analytics.overtimeTitle}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-2xl border p-4'>
            <div className='text-muted-foreground text-xs uppercase'>{attendanceUiCopy.analytics.overtimeApproved}</div>
            <div className='mt-1 text-xl font-semibold text-emerald-600'>
              {formatHours(data.approvedMinutes)}
            </div>
          </div>
          <div className='rounded-2xl border p-4'>
            <div className='text-muted-foreground text-xs uppercase'>{attendanceUiCopy.analytics.overtimePending}</div>
            <div className='mt-1 text-xl font-semibold text-amber-600'>
              {formatHours(data.pendingMinutes)}
            </div>
          </div>
        </div>
        <div className='rounded-2xl border p-4'>
          <div className='text-muted-foreground text-xs uppercase'>{attendanceUiCopy.analytics.overtimeEmployeeCount}</div>
          <div className='mt-1 text-2xl font-semibold'>{formatNumber(data.employeeCount)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AttendanceAnalyticsDashboard() {
  const { data: stats, isLoading, error } = useAttendanceStatsQuery();

  const avgWorkedDisplay = useMemo(() => {
    if (!stats) return '0';
    return `${stats.summary.avgWorkedHours}h`;
  }, [stats]);

  if (isLoading) return <AnalyticsSkeleton />;
  if (error || !stats) {
    return (
      <Card className='rounded-3xl border-rose-500/30'>
        <CardHeader>
          <CardDescription>{attendanceUiCopy.analytics.errorDescription}</CardDescription>
          <CardTitle>{attendanceUiCopy.analytics.errorTitle}</CardTitle>
        </CardHeader>
        <CardContent className='text-muted-foreground text-sm'>
          {attendanceUiCopy.analytics.errorContent}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <KpiStatCard
          title={attendanceUiCopy.analytics.kpi.attendanceRateTitle}
            value={`${stats.summary.attendanceRate}%`}
            subtitle={attendanceUiCopy.analytics.kpi.attendanceRateSubtitle(stats.summary.presentToday, stats.summary.totalEmployees)}
            icon={Icons.check}
          />
          <KpiStatCard
            title={attendanceUiCopy.analytics.kpi.pendingExceptionsTitle}
            value={formatNumber(stats.summary.pendingExceptions)}
            subtitle={attendanceUiCopy.analytics.kpi.pendingExceptionsSubtitle}
            icon={Icons.alertCircle}
          />
          <KpiStatCard
            title={attendanceUiCopy.analytics.kpi.approvedOvertimeTitle}
            value={`${(stats.overtimeBreakdown.approvedMinutes / 60).toFixed(1)}h`}
            subtitle={attendanceUiCopy.analytics.kpi.approvedOvertimeSubtitle(formatNumber(stats.overtimeBreakdown.employeeCount))}
            icon={Icons.clock}
          />
          <KpiStatCard
            title={attendanceUiCopy.analytics.kpi.avgWorkedTitle}
            value={avgWorkedDisplay}
            subtitle={attendanceUiCopy.analytics.kpi.avgWorkedSubtitle}
            icon={Icons.activity}
          />
        </div>

        <div className='grid grid-cols-1 gap-4 xl:grid-cols-12'>
          <div className='xl:col-span-7'>
            <DailyTrendChart data={stats.dailyTrend} />
          </div>
          <div className='xl:col-span-5'>
            <DepartmentBarChart data={stats.departmentRates} />
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 xl:grid-cols-12'>
          <div className='xl:col-span-7'>
            <ExceptionSummaryCards data={stats.exceptionSummary} />
          </div>
          <div className='xl:col-span-5'>
            <OvertimeBreakdown data={stats.overtimeBreakdown} />
          </div>
        </div>
      </div>
  );
}
