'use client';

import { LabelList, Pie, PieChart } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { overviewDemoCopy, overviewDemoPieChartData } from '@/locales/vi/overview-dashboard';

const chartConfig = {
  visitors: {
    label: overviewDemoCopy.pieGraph.labels.visitors
  },
  chrome: {
    label: overviewDemoCopy.pieGraph.labels.chrome,
    color: 'var(--chart-1)'
  },
  safari: {
    label: overviewDemoCopy.pieGraph.labels.safari,
    color: 'var(--chart-2)'
  },
  firefox: {
    label: overviewDemoCopy.pieGraph.labels.firefox,
    color: 'var(--chart-3)'
  },
  edge: {
    label: overviewDemoCopy.pieGraph.labels.edge,
    color: 'var(--chart-4)'
  },
  other: {
    label: overviewDemoCopy.pieGraph.labels.other,
    color: 'var(--chart-5)'
  }
} satisfies ChartConfig;

export function PieGraph() {
  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='items-center pb-0'>
        <CardTitle>
          {overviewDemoCopy.pieGraph.title}
          <Badge variant='outline'>
            <Icons.trendingUp />
            {overviewDemoCopy.pieGraph.trend}
          </Badge>
        </CardTitle>
        <CardDescription>{overviewDemoCopy.pieGraph.description}</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-1 items-center justify-center pb-0'>
        <ChartContainer
          config={chartConfig}
          className='[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[300px] min-h-[250px]'
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey='visitors' hideLabel />} />
            <Pie
              data={overviewDemoPieChartData}
              innerRadius={30}
              dataKey='visitors'
              radius={10}
              cornerRadius={8}
              paddingAngle={4}
            >
              <LabelList
                dataKey='visitors'
                stroke='none'
                fontSize={12}
                fontWeight={500}
                fill='currentColor'
                formatter={(value: number) => value.toString()}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
