'use client';

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
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardWidgetDto } from '../queries/dashboard-queries';
import { registerWidget } from '../widget-registry/widget-registry';
import { DashboardWidgetId } from '../widget-registry/widget-ids';
import { dashboardCopy } from '@/locales/vi/dashboard';

const CURRENCY_COLOR = 'var(--chart-3)';

interface PayrollPayload {
  labels: string[];
  series: number[];
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function PayrollCostTrendChart({ widget }: { widget: DashboardWidgetDto }) {
  const data = widget.data as PayrollPayload;

  if (!data.labels || data.labels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
          <CardDescription>{dashboardCopy.payrollCostTrend.emptyState}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartData = data.labels.map((label: string, i: number) => ({
    period: label,
    cost: data.series[i] ?? 0,
  }));

  const chartConfig = {
    cost: {
      label: dashboardCopy.payrollCostTrend.netLabel,
      color: CURRENCY_COLOR,
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        <CardDescription>{dashboardCopy.payrollCostTrend.title}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="max-h-[320px] min-h-[240px] w-full"
        >
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="cost-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CURRENCY_COLOR} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CURRENCY_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tickFormatter={(v: number) => formatCurrency(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value: unknown) => formatCurrency(Number(value))}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke={CURRENCY_COLOR}
              fill="url(#cost-gradient)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

registerWidget(DashboardWidgetId.PAYROLL_COST_TREND, PayrollCostTrendChart);
