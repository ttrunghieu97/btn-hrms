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
import { Pie, PieChart, Cell, LabelList } from 'recharts';
import type { DashboardWidgetDto } from '../queries/dashboard-queries';
import { registerWidget } from '../widget-registry/widget-registry';
import { DashboardWidgetId } from '../widget-registry/widget-ids';
import { dashboardCopy } from '@/locales/vi/dashboard';

const STATUS_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];

interface StatusPayload {
  labels: string[];
  series: number[];
}

function EmployeeStatusChart({ widget }: { widget: DashboardWidgetDto }) {
  const data = widget.data as StatusPayload;
  const total = data.series.reduce((sum: number, v: number) => sum + v, 0);

  const chartData = data.labels.map((label: string, i: number) => ({
    name: label,
    value: data.series[i] ?? 0,
    fill: STATUS_COLORS[i % STATUS_COLORS.length],
  }));

  const chartConfig = data.labels.reduce<ChartConfig>(
    (config, label, i) => ({
      ...config,
      [label]: {
        label,
        color: STATUS_COLORS[i % STATUS_COLORS.length],
      },
    }),
    {},
  );

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
          <CardDescription>{dashboardCopy.employeeStatus.emptyState}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="items-center pb-0">
        <CardTitle>{widget.title}</CardTitle>
        <CardDescription>
          {dashboardCopy.employeeStatus.totalSuffix}: {total}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[280px] min-h-[240px]"
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="name" hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={30}
              outerRadius={90}
              cornerRadius={6}
              paddingAngle={3}
            >
              <LabelList
                dataKey="value"
                stroke="none"
                fontSize={12}
                fontWeight={500}
                fill="currentColor"
                formatter={(v: number) => v.toString()}
              />
              {chartData.map((entry: { name: string; fill: string }, i: number) => (
                <Cell key={`cell-${i}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

registerWidget(DashboardWidgetId.EMPLOYEE_STATUS, EmployeeStatusChart);
