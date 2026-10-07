import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';

export default function ScheduleLoading() {
  return <DataTableSkeleton columnCount={7} rowCount={10} />;
}
