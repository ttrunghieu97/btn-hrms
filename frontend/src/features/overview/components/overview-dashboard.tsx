'use client';

interface RecentEmployeeDto {
  id: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  fullName: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  employeeCode: string;
  position?: string;
  positionName?: string;
  departmentName?: string;
  department?: { name: string };
  startDate?: string;
}

interface DepartmentStatDto {
  name: string;
  count: number;
}

interface DashboardResponseDto {
  summary: {
    todayAttendance: number;
    totalEmployees: number;
    activeEmployees: number;
    avgWorkedHours: number;
    scheduleCoverageRate: number;
    todayAssignments: number;
    pendingRequests: number;
  };
  comparisons: {
    employeeGrowth: number;
    attendanceChange?: number;
    taskCompletionChange?: number;
  };
  headcountSnapshot: {
    totalHeadcount: number;
    snapshotDate: string;
  };
  payrollSnapshot: {
    totalNet: number;
    totalGross: number;
    totalEmployerContributions: number;
    employeeCount: number;
  };
  expiringSoon: {
    contract: number;
    probation: number;
    overdue: number;
  };
  taskStats: {
    completionRate: number;
    completed: number;
    total: number;
    inProgress: number;
    overdue: number;
  };
  attendanceMonthly: {
    utilizationRate: number;
    totalWorkedMinutes: number;
    totalScheduledMinutes: number;
    totalLateCount: number;
    totalAbsentDays: number;
    totalLeaveDays: number;
    totalOvertimeMinutes: number;
  };
  attendanceTrends: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
  }>;
  taskPriorityStats: Array<{
    priority: string;
    count: number;
  }>;
  recentEmployees: RecentEmployeeDto[];
  departmentStats: DepartmentStatDto[];
}
import { formatDateVN } from "@/lib/date";
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from 'boneyard-js/react';
import { useDashboardOverviewQuery } from '@/features/dashboard';
import { Icons } from '@/components/icons';
import { extractProtectedAssetUrl } from '@/lib/asset-url';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import { commonUiCopy } from '@/lib/app-copy';
import { overviewUiCopy } from '@/locales/vi/overview';
import { cn } from '@/lib/utils';
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
  YAxis
} from 'recharts';

const priorityPalette: Record<string, string> = {
  low: 'var(--chart-3)',
  medium: 'var(--chart-1)',
  high: 'var(--chart-4)',
  urgent: 'var(--chart-2)'
};

const attendanceConfig = {
  count: { label: overviewUiCopy.attendanceCountLabel, color: 'var(--chart-1)' }
} satisfies ChartConfig;

const departmentConfig = {
  count: { label: overviewUiCopy.departmentCountLabel, color: 'var(--chart-2)' }
} satisfies ChartConfig;

const taskPriorityConfig = {
  low: { label: overviewUiCopy.priorityLow, color: priorityPalette.low },
  medium: { label: overviewUiCopy.priorityMedium, color: priorityPalette.medium },
  high: { label: overviewUiCopy.priorityHigh, color: priorityPalette.high },
  urgent: { label: overviewUiCopy.priorityUrgent, color: priorityPalette.urgent }
} satisfies ChartConfig;

function formatNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat('en-US').format(Number.isFinite(numeric) ? numeric : 0);
}

function formatCurrency(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function formatHoursFromMinutes(minutes: number | null | undefined) {
  return `${((minutes ?? 0) / 60).toFixed(1)}h`;
}

function formatTrend(value: number | undefined, positiveLabel: string, negativeLabel: string) {
  const normalized = Number(value ?? 0);
  if (normalized === 0) return overviewUiCopy.noChange;
  return normalized > 0
    ? `${Math.abs(normalized)}% ${positiveLabel}`
    : `${Math.abs(normalized)}% ${negativeLabel}`;
}

function getTrendAppearance(value: number | undefined) {
  const normalized = Number(value ?? 0);
  if (normalized > 0) {
    return {
      icon: Icons.trendingUp,
      className:
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    };
  }
  if (normalized < 0) {
    return {
      icon: Icons.trendingDown,
      className: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    };
  }
  return {
    icon: Icons.minus,
    className: 'border-border bg-muted text-muted-foreground'
  };
}

function getEmployeeInitials(employee: RecentEmployeeDto) {
  return `${employee.firstName?.[0] ?? ''}${employee.lastName?.[0] ?? ''}`.toUpperCase();
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return commonUiCopy.noDate;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDateVN(date);
}

function getRecentEmployeeKey(employee: RecentEmployeeDto, index: number) {
  return [
    employee.username,
    employee.startDate ? String(employee.startDate) : '',
    employee.firstName,
    employee.lastName,
    index
  ].join(':');
}

function KpiCard({
  title,
  value,
  description,
  trend
}: {
  title: string;
  value: string;
  description: string;
  trend: number | undefined;
}) {
  const appearance = getTrendAppearance(trend);
  const TrendIcon = appearance.icon;

  return (
    <Card className='border-border/60 bg-card/80 overflow-hidden rounded-2xl backdrop-blur-sm'>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className='text-3xl'>{value}</CardTitle>
        <CardAction>
          <Badge
            variant='outline'
            className={cn('gap-1.5 rounded-full px-3 py-1', appearance.className)}
          >
            <TrendIcon className='size-3.5' />
            {Math.abs(Number(trend ?? 0))}%
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className='text-muted-foreground text-sm'>{description}</CardFooter>
    </Card>
  );
}

function DepartmentChart({ data }: { data: DepartmentStatDto[] }) {
  const topDepartments = data
    .toSorted((left, right) => right.count - left.count)
    .slice(0, 6)
    .map((item) => ({
      ...item,
      shortName: item.name.length > 14 ? `${item.name.slice(0, 14)}...` : item.name
    }));

  return (
    <Card className='rounded-3xl'>
      <CardHeader>
        <CardDescription>{overviewUiCopy.departmentCapability}</CardDescription>
        <CardTitle>{overviewUiCopy.departmentHeadcountTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={departmentConfig} className='h-[320px] w-full'>
          <BarChart accessibilityLayer data={topDepartments}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey='shortName' tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey='count' fill='var(--color-count)' radius={[10, 10, 4, 4]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function AttendanceTrendChart({ data }: { data: DashboardResponseDto['attendanceTrends'] }) {
  const chartData = data.map((item) => ({
    ...item,
    label: formatShortDate(item.date)
  }));

  return (
    <Card className='rounded-3xl'>
      <CardHeader>
        <CardDescription>{overviewUiCopy.attendanceTrend}</CardDescription>
        <CardTitle>{overviewUiCopy.recent30DaysAttendance}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={attendanceConfig} className='h-[320px] w-full'>
          <AreaChart accessibilityLayer data={chartData}>
            <defs>
              <linearGradient id='overview-attendance-fill' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='var(--color-count)' stopOpacity={0.35} />
                <stop offset='95%' stopColor='var(--color-count)' stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey='label' tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type='monotone'
              dataKey='count'
              stroke='var(--color-count)'
              fill='url(#overview-attendance-fill)'
              strokeWidth={2.5}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function TaskPriorityChart({ data }: { data: DashboardResponseDto['taskPriorityStats'] }) {
  const chartData = data.map((item) => ({
    ...item,
    fill: priorityPalette[item.priority] ?? 'var(--chart-5)'
  }));

  return (
    <Card className='rounded-3xl'>
      <CardHeader>
        <CardDescription>{overviewUiCopy.operationalPressure}</CardDescription>
        <CardTitle>{overviewUiCopy.taskPriorityTitle}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <ChartContainer config={taskPriorityConfig} className='mx-auto h-[260px] max-w-[320px]'>
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey='priority'
                  formatter={(value) =>
                    formatNumber(Array.isArray(value) ? value[0] : value)
                  }
                />
              }
            />
            <Pie
              data={chartData}
              dataKey='count'
              nameKey='priority'
              innerRadius={72}
              outerRadius={102}
              paddingAngle={3}
            >
              {chartData.map((entry) => (
                <Cell key={entry.priority} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey='priority' />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function RecentEmployeesCard({ employees }: { employees: RecentEmployeeDto[] }) {
  const router = useRouter();

  return (
    <Card className='rounded-3xl'>
      <CardHeader>
        <CardDescription>{overviewUiCopy.recentEmployeesDescription}</CardDescription>
        <CardTitle>{overviewUiCopy.recentEmployeesTitle}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {employees.map((employee, index) => (
          <button
            type='button'
            key={getRecentEmployeeKey(employee, index)}
            className='flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-colors hover:bg-accent/50 focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
            onClick={() => router.push(`/employees?employeeId=${employee.username}`)}
          >
            <Avatar className='size-11'>
              <AvatarImage
                src={extractProtectedAssetUrl(employee.avatar) || undefined}
                alt={employee.username}
              />
              <AvatarFallback>{getEmployeeInitials(employee)}</AvatarFallback>
            </Avatar>
            <div className='min-w-0 flex-1'>
              <div className='truncate font-medium'>{`${employee.firstName} ${employee.lastName}`}</div>
              <div className='text-muted-foreground truncate text-sm'>
                {employee.position || commonUiCopy.noPosition}
              </div>
            </div>
            <div className='text-right text-xs'>
              <div className='font-medium'>
                {String(employee.department?.name ?? commonUiCopy.noDepartment)}
              </div>
              <div className='text-muted-foreground'>
                {formatShortDate(
                  typeof employee.startDate === 'string' ? employee.startDate : null
                )}
              </div>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function OverviewErrorState({ message }: { message: string }) {
  return (
    <PageContainer>
      <Card className='rounded-3xl border-rose-500/30'>
        <CardHeader>
          <CardDescription>{overviewUiCopy.errorDescription}</CardDescription>
          <CardTitle>{overviewUiCopy.errorTitle}</CardTitle>
        </CardHeader>
        <CardContent className='text-muted-foreground text-sm'>{message}</CardContent>
      </Card>
    </PageContainer>
  );
}

export default function OverviewDashboard() {
  const router = useRouter();
  const { data, isLoading, error } = useDashboardOverviewQuery();
  const overview = data as DashboardResponseDto | undefined;

  if (error && !isLoading && !overview) {
    return (
      <OverviewErrorState
        message={getVietnameseApiErrorMessage(error, 'Khong the tai du lieu tong quan')}
      />
    );
  }

  const attendanceRate =
    overview!.summary.totalEmployees > 0
      ? Math.round((overview!.summary.todayAttendance / overview!.summary.totalEmployees) * 100)
      : 0;

  const heroTrend = getTrendAppearance(overview!.comparisons.employeeGrowth);
  const HeroTrendIcon = heroTrend.icon;

  return (
    <PageContainer>
      <Skeleton name='overview-dashboard' loading={isLoading || !overview}>
        {overview && <>
          <div className='space-y-6'>
            <Card className='from-card via-card to-primary/5 relative overflow-hidden rounded-[28px] border bg-gradient-to-br'>
          <div className='bg-primary/10 absolute top-0 right-0 h-40 w-40 rounded-full blur-3xl' />
          <div className='bg-chart-2/10 absolute bottom-0 left-0 h-32 w-32 rounded-full blur-3xl' />
          <CardContent className='relative grid gap-6 py-6 lg:grid-cols-[1.5fr_1fr]'>
            <div className='space-y-4'>
              <Badge variant='outline' className='rounded-full px-3 py-1 text-xs uppercase'>
                {overviewUiCopy.heroBadge}
              </Badge>
              <div className='space-y-2'>
                <h2 className='max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl'>
                  {overviewUiCopy.heroTitle}
                </h2>
                <p className='text-muted-foreground max-w-2xl text-sm md:text-base'>
                  {overviewUiCopy.heroDescription}
                </p>
              </div>
              <div className='grid gap-3 sm:grid-cols-3'>
                <div className='rounded-2xl border bg-background/60 p-4'>
                  <div className='text-muted-foreground text-xs uppercase'>
                    {overviewUiCopy.attendanceRateTitle}
                  </div>
                  <div className='mt-2 text-2xl font-semibold'>{attendanceRate}%</div>
                  <div className='text-muted-foreground mt-1 text-sm'>
                    {overview.summary.todayAttendance}/{overview.summary.totalEmployees}{' '}
                    {overviewUiCopy.departmentCountLabel.toLowerCase()}
                  </div>
                </div>
                <div className='rounded-2xl border bg-background/60 p-4'>
                  <div className='text-muted-foreground text-xs uppercase'>
                    {overviewUiCopy.headcountSnapshotTitle}
                  </div>
                  <div className='mt-2 text-2xl font-semibold'>
                    {formatNumber(overview.headcountSnapshot.totalHeadcount)}
                  </div>
                  <div className='text-muted-foreground mt-1 text-sm'>
                    {overviewUiCopy.snapshotDatePrefix}{' '}
                    {formatShortDate(
                      typeof overview.headcountSnapshot.snapshotDate === 'string'
                        ? overview.headcountSnapshot.snapshotDate
                        : null
                    )}
                  </div>
                </div>
                <div className='rounded-2xl border bg-background/60 p-4'>
                  <div className='text-muted-foreground text-xs uppercase'>
                    {overviewUiCopy.netPayrollTitle}
                  </div>
                  <div className='mt-2 text-2xl font-semibold'>
                    {formatCurrency(overview.payrollSnapshot.totalNet)}
                  </div>
                  <div className='text-muted-foreground mt-1 text-sm'>
                    {overviewUiCopy.latestPeriodEmployees(
                      formatNumber(overview.payrollSnapshot.employeeCount)
                    )}
                  </div>
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='default'
                  size='sm'
                  className='rounded-full'
                  onClick={() => router.push('/employees?action=create')}
                >
                  <Icons.add className='mr-1.5 size-4' />
                  Thêm nhân viên
                </Button>
              </div>
              <div className='rounded-3xl border bg-background/70 p-5 backdrop-blur-sm'>
                <div className='flex items-center justify-between'>
                  <div>
                    <div className='text-muted-foreground text-sm'>
                      {overviewUiCopy.employeeGrowthTitle}
                    </div>
                    <div className='mt-2 text-4xl font-semibold'>
                      {Math.abs(overview.comparisons.employeeGrowth ?? 0)}%
                    </div>
                  </div>
                  <Badge
                    variant='outline'
                    className={cn('gap-1.5 rounded-full px-3 py-1', heroTrend.className)}
                  >
                    <HeroTrendIcon className='size-3.5' />
                    {overview.comparisons.employeeGrowth ?? 0}%
                  </Badge>
                </div>
                <div className='text-muted-foreground mt-3 text-sm'>
                  {formatTrend(
                    overview.comparisons.employeeGrowth,
                    overviewUiCopy.positiveTrend,
                    overviewUiCopy.negativeTrend
                  )}
                </div>
                <Separator className='my-4' />
                <div className='grid gap-3 sm:grid-cols-2'>
                  <div>
                    <div className='text-muted-foreground text-xs uppercase'>
                      {overviewUiCopy.completionRateTitle}
                    </div>
                    <div className='mt-1 text-xl font-semibold'>
                      {overview.taskStats.completionRate}%
                    </div>
                  </div>
                  <div>
                    <div className='text-muted-foreground text-xs uppercase'>
                      {overviewUiCopy.utilizationTitle}
                    </div>
                    <div className='mt-1 text-xl font-semibold'>
                      {overview.attendanceMonthly.utilizationRate}%
                    </div>
                  </div>
                </div>
              </div>

              <div className='rounded-3xl border bg-background/70 p-5 backdrop-blur-sm'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>
                    {overviewUiCopy.currentMonthCapacityTitle}
                  </span>
                  <span className='font-medium'>
                    {overview.attendanceMonthly.utilizationRate}%
                  </span>
                </div>
                <Progress
                  value={overview.attendanceMonthly.utilizationRate}
                  className='mt-3 h-2.5'
                />
                <div className='text-muted-foreground mt-3 flex items-center justify-between text-xs'>
                  <span>
                    {formatHoursFromMinutes(overview.attendanceMonthly.totalWorkedMinutes)}{' '}
                    {overviewUiCopy.workedSuffix}
                  </span>
                  <span>
                    {formatHoursFromMinutes(overview.attendanceMonthly.totalScheduledMinutes)}{' '}
                    {overviewUiCopy.plannedSuffix}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <KpiCard
            title={overviewUiCopy.totalEmployeesTitle}
            value={formatNumber(overview.summary.totalEmployees)}
            description={formatTrend(
              overview.comparisons.employeeGrowth,
              overviewUiCopy.positiveTrend,
              overviewUiCopy.negativeTrend
            )}
            trend={overview.comparisons.employeeGrowth}
          />
          <KpiCard
            title={overviewUiCopy.todayAttendanceTitle}
            value={formatNumber(overview.summary.todayAttendance)}
            description={overviewUiCopy.attendanceTodayDescription(
              attendanceRate,
              formatNumber(overview.summary.todayAttendance),
              formatNumber(overview.summary.totalEmployees)
            )}
            trend={overview.comparisons.attendanceChange}
          />
          <KpiCard
            title={overviewUiCopy.completedTasksTitle}
            value={`${overview.taskStats.completionRate}%`}
            description={overviewUiCopy.completedTasksDescription(
              formatNumber(overview.taskStats.completed),
              formatNumber(overview.taskStats.total)
            )}
            trend={overview.comparisons.taskCompletionChange}
          />
          <KpiCard
            title={overviewUiCopy.netSalaryTitle}
            value={formatCurrency(overview.payrollSnapshot.totalNet)}
            description={overviewUiCopy.latestPeriodEmployees(
              formatNumber(overview.payrollSnapshot.employeeCount)
            )}
            trend={overview.comparisons.employeeGrowth}
          />
        </div>

        <div className='grid grid-cols-1 gap-4 xl:grid-cols-12'>
          <div className='xl:col-span-7'>
            <AttendanceTrendChart data={overview.attendanceTrends} />
          </div>
          <div className='xl:col-span-5'>
            <RecentEmployeesCard employees={overview.recentEmployees} />
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 xl:grid-cols-12'>
          <div className='xl:col-span-7'>
            <DepartmentChart data={overview.departmentStats} />
          </div>
          <div className='xl:col-span-5'>
            <TaskPriorityChart data={overview.taskPriorityStats} />
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
          <Card className='rounded-3xl'>
            <CardHeader>
              <CardDescription>{overviewUiCopy.operationsHealth}</CardDescription>
              <CardTitle>{overviewUiCopy.staffPressurePoints}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between rounded-2xl border p-4'>
                <div>
                  <div className='text-sm font-medium'>{overviewUiCopy.contractsExpiring}</div>
                  <div className='text-muted-foreground text-xs'>
                    {overviewUiCopy.within30Days}
                  </div>
                </div>
                <div className='text-2xl font-semibold'>
                  {formatNumber(overview.expiringSoon.contract)}
                </div>
              </div>
              <div className='flex items-center justify-between rounded-2xl border p-4'>
                <div>
                  <div className='text-sm font-medium'>{overviewUiCopy.probationEnding}</div>
                  <div className='text-muted-foreground text-xs'>
                    {overviewUiCopy.upcomingReview}
                  </div>
                </div>
                <div className='text-2xl font-semibold'>
                  {formatNumber(overview.expiringSoon.probation)}
                </div>
              </div>
              <div className='flex items-center justify-between rounded-2xl border p-4'>
                <div>
                  <div className='text-sm font-medium'>{overviewUiCopy.overdueContracts}</div>
                  <div className='text-muted-foreground text-xs'>
                    {overviewUiCopy.immediateAction}
                  </div>
                </div>
                <div className='text-2xl font-semibold text-rose-600 dark:text-rose-300'>
                  {formatNumber(overview.expiringSoon.overdue)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='rounded-3xl'>
            <CardHeader>
              <CardDescription>{overviewUiCopy.monthlyAttendance}</CardDescription>
              <CardTitle>{overviewUiCopy.shiftQuality}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-5'>
              <div>
                <div className='mb-2 flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>
                    {overviewUiCopy.utilizationTitle}
                  </span>
                  <span className='font-medium'>
                    {overview.attendanceMonthly.utilizationRate}%
                  </span>
                </div>
                <Progress value={overview.attendanceMonthly.utilizationRate} />
              </div>
              <div className='grid grid-cols-2 gap-3 text-sm'>
                <div className='rounded-2xl border p-3'>
                  <div className='text-muted-foreground text-xs uppercase'>
                    {overviewUiCopy.lateCount}
                  </div>
                  <div className='mt-1 text-xl font-semibold'>
                    {formatNumber(overview.attendanceMonthly.totalLateCount)}
                  </div>
                </div>
                <div className='rounded-2xl border p-3'>
                  <div className='text-muted-foreground text-xs uppercase'>
                    {overviewUiCopy.absentDays}
                  </div>
                  <div className='mt-1 text-xl font-semibold'>
                    {formatNumber(overview.attendanceMonthly.totalAbsentDays)}
                  </div>
                </div>
                <div className='rounded-2xl border p-3'>
                  <div className='text-muted-foreground text-xs uppercase'>
                    {overviewUiCopy.leaveDays}
                  </div>
                  <div className='mt-1 text-xl font-semibold'>
                    {formatNumber(overview.attendanceMonthly.totalLeaveDays)}
                  </div>
                </div>
                <div className='rounded-2xl border p-3'>
                  <div className='text-muted-foreground text-xs uppercase'>
                    {overviewUiCopy.overtime}
                  </div>
                  <div className='mt-1 text-xl font-semibold'>
                    {formatHoursFromMinutes(overview.attendanceMonthly.totalOvertimeMinutes)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='rounded-3xl'>
            <CardHeader>
              <CardDescription>{overviewUiCopy.payrollOpsSummary}</CardDescription>
              <CardTitle>{overviewUiCopy.financeExecution}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='rounded-2xl border p-4'>
                <div className='text-muted-foreground text-xs uppercase'>
                  {overviewUiCopy.totalGross}
                </div>
                <div className='mt-1 text-2xl font-semibold'>
                  {formatCurrency(overview.payrollSnapshot.totalGross)}
                </div>
              </div>
              <div className='rounded-2xl border p-4'>
                <div className='text-muted-foreground text-xs uppercase'>
                  {overviewUiCopy.employerContribution}
                </div>
                <div className='mt-1 text-2xl font-semibold'>
                  {formatCurrency(overview.payrollSnapshot.totalEmployerContributions)}
                </div>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div className='rounded-2xl border p-4'>
                  <div className='text-muted-foreground text-xs uppercase'>
                    {overviewUiCopy.inProgress}
                  </div>
                  <div className='mt-1 text-xl font-semibold'>
                    {formatNumber(overview.taskStats.inProgress)}
                  </div>
                </div>
                <div className='rounded-2xl border p-4'>
                  <div className='text-muted-foreground text-xs uppercase'>
                    {overviewUiCopy.overdueTasks}
                  </div>
                  <div className='mt-1 text-xl font-semibold'>
                    {formatNumber(overview.taskStats.overdue)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='rounded-3xl'>
            <CardHeader>
              <CardDescription>{overviewUiCopy.monthlyAttendance}</CardDescription>
              <CardTitle>{overviewUiCopy.todayCoverage}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <div className='mb-2 flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>{overviewUiCopy.scheduleCoverageRate}</span>
                  <span className='font-medium'>{overview.summary.scheduleCoverageRate}%</span>
                </div>
                <Progress value={overview.summary.scheduleCoverageRate} />
              </div>
              <div className='rounded-2xl border p-4'>
                <div className='text-muted-foreground text-xs uppercase'>{overviewUiCopy.scheduleAssignments}</div>
                <div className='mt-1 text-2xl font-semibold'>{formatNumber(overview.summary.todayAssignments)}</div>
              </div>
              <div className='rounded-2xl border p-4'>
                <div className='text-muted-foreground text-xs uppercase'>{overviewUiCopy.pendingRequests}</div>
                <div className='mt-1 text-2xl font-semibold text-amber-600'>{formatNumber(overview.summary.pendingRequests)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
          </>}
      </Skeleton>
    </PageContainer>
  );
}
