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
  Tooltip,
} from 'recharts';
import type { DashboardWidgetDto } from '../queries/dashboard-queries';
import { registerWidget } from '../widget-registry/widget-registry';
import { DashboardWidgetId } from '../widget-registry/widget-ids';
import { dashboardCopy } from '@/locales/vi/dashboard';

const SERIES_CONFIG: Record<string, { color: string }> = {
  Hires: { color: 'var(--chart-1)' },
  Leavers: { color: 'var(--chart-4)' },
};

interface SeriesItem {
  name: string;
  data: number[];
}

interface HiresLeaversPayload {
  labels: string[];
  series: SeriesItem[];
}

function HiresLeaversChart({ widget }: { widget: DashboardWidgetDto }) {
  const data = widget.data as HiresLeaversPayload;

  if (!data.labels || data.labels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
          <CardDescription>{dashboardCopy.hiresLeavers.emptyState}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Rechart-friendly shape: [{ month, Hires: number, Leavers: number }]
  const chartData = data.labels.map((label: string, i: number) => {
    const point: Record<string, string | number> = { month: label };
    for (const s of data.series) {
      point[s.name] = s.data[i] ?? 0;
    }
    return point;
  });

  const chartConfig = data.series.reduce<ChartConfig>(
    (config, s) => {
      const cfg = SERIES_CONFIG[s.name];
      return {
        ...config,
        [s.name]: {
          label: s.name === 'Hires'
            ? dashboardCopy.hiresLeavers.hiresLabel
            : dashboardCopy.hiresLeavers.leaversLabel,
          color: cfg?.color ?? 'var(--chart-1)',
        },
      };
    },
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        <CardDescription>
          {dashboardCopy.hiresLeavers.hiresLabel} & {dashboardCopy.hiresLeavers.leaversLabel}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="max-h-[320px] min-h-[240px] w-full"
        >
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <defs>
              {data.series.map((s) => {
                const cfg = SERIES_CONFIG[s.name];
                const color = cfg?.color ?? 'var(--chart-1)';
                return (
                  <linearGradient key={s.name} id={`gradient-${s.name}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis tickLine={false} axisLine={false} fontSize={12} />
            <ChartTooltip
              content={<ChartTooltipContent />}
            />
            {data.series.map((s) => {
              const cfg = SERIES_CONFIG[s.name];
              return (
                <Area
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={cfg?.color ?? 'var(--chart-1)'}
                  fill={`url(#gradient-${s.name})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              );
            })}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

registerWidget(DashboardWidgetId.HIRES_VS_LEAVERS, HiresLeaversChart);
