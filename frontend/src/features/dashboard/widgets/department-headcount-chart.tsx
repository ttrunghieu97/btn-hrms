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
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardWidgetDto } from '../queries/dashboard-queries';
import { registerWidget } from '../widget-registry/widget-registry';
import { DashboardWidgetId } from '../widget-registry/widget-ids';
import { dashboardCopy } from '@/locales/vi/dashboard';

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];

interface DeptPayload {
  labels: string[];
  series: number[];
}

function DepartmentHeadcountChart({ widget }: { widget: DashboardWidgetDto }) {
  const data = widget.data as DeptPayload;

  const chartData = data.labels.map((label: string, i: number) => ({
    department: label,
    headcount: data.series[i] ?? 0,
    fill: COLORS[i % COLORS.length],
  }));

  const chartConfig = data.labels.reduce<ChartConfig>(
    (config, label, i) => ({
      ...config,
      [label]: {
        label,
        color: COLORS[i % COLORS.length],
      },
    }),
    {},
  );

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
          <CardDescription>{dashboardCopy.departmentHeadcount.emptyState}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        <CardDescription>
          {chartData.length} {dashboardCopy.departmentHeadcount.departmentSuffix}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="max-h-[350px] min-h-[250px] w-full"
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 100, right: 20, top: 10, bottom: 10 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <YAxis
              dataKey="department"
              type="category"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={90}
            />
            <XAxis type="number" hide />
            <ChartTooltip
              content={<ChartTooltipContent nameKey="department" hideLabel />}
              cursor={{ fill: 'var(--muted)' }}
            />
            <Bar
              dataKey="headcount"
              radius={[0, 4, 4, 0]}
              barSize={20}
            >
              {chartData.map(
                (entry: { department: string; fill: string }, i: number) => (
                  <Cell key={`cell-${i}`} fill={entry.fill} />
                ),
              )}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

registerWidget(DashboardWidgetId.DEPARTMENT_HEADCOUNT, DepartmentHeadcountChart);
