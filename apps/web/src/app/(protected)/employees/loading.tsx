import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';

export default function EmployeesLoading() {
  return <DataTableSkeleton columnCount={6} rowCount={10} />;
}
