'use client';

import '../widgets';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardQuery } from '../queries/dashboard-queries';
import { getWidgetComponent } from '../widget-registry/widget-registry';
import type { DashboardLayoutId } from '../dashboard-layouts';
import { DASHBOARD_LAYOUTS } from '../dashboard-layouts';
import { dashboardCopy } from '@/locales/vi/dashboard';

interface WidgetDashboardProps {
  layoutId: DashboardLayoutId;
}

function WidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-1/3" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-40 w-full" />
      </CardContent>
    </Card>
  );
}

export function WidgetDashboard({ layoutId }: WidgetDashboardProps) {
  const { data, isLoading, error } = useDashboardQuery();
  const layout = DASHBOARD_LAYOUTS[layoutId];

  if (!layout) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {dashboardCopy.common.error}
        </CardContent>
      </Card>
    );
  }

  const layoutCopy = dashboardCopy.layouts[layoutId];

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {dashboardCopy.common.error}
        </CardContent>
      </Card>
    );
  }

  const widgetMap = new Map(
    data?.widgets?.map((w) => [w.id, w]) ?? [],
  );

  const visibleWidgets = layout.widgets
    .map((id) => widgetMap.get(id))
    .filter((w): w is NonNullable<typeof w> => w !== undefined);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <>
            <WidgetSkeleton />
            <WidgetSkeleton />
            <WidgetSkeleton />
          </>
        )}

        {visibleWidgets.length === 0 && !isLoading && (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {dashboardCopy.common.empty}
              </CardContent>
            </Card>
          </div>
        )}

        {visibleWidgets.map((widget) => {
          const Component = getWidgetComponent(widget.id);
          if (!Component) return null;
          return <Component key={widget.id} widget={widget} />;
        })}
      </div>
    </div>
  );
}
