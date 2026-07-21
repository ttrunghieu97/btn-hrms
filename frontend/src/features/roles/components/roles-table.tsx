'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryState, useQueryStates } from 'nuqs';
import { motion, useReducedMotion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataTable } from '@/hooks/use-data-table';
import { commonUiCopy, roleUiCopy } from '@/lib/app-copy';
import { getSortingStateParser } from '@/lib/parsers';
import { errorUiCopy } from '@/locales/vi/system-ui';
import { rolesQueryOptions } from '../api/queries';
import { roleColumns } from './roles-table-columns';
import { downloadTableAsCsv } from '@/lib/csv/export-csv';
import type { Role } from '../api/service';
import { createTableSearchParams } from '@/lib/pagination';

const ROLE_TYPE_TABS = [
  { value: 'all', label: roleUiCopy.tabs.all, icon: Icons.circle },
  { value: 'system', label: roleUiCopy.tabs.system, icon: Icons.shield },
  { value: 'custom', label: roleUiCopy.tabs.custom, icon: Icons.shieldCheck },
] as const;

type RoleTabValue = (typeof ROLE_TYPE_TABS)[number]['value'];

const ROLE_EXPORT_FILENAME = 'vai-tro-phan-quyen.csv';
const EXPORT_LABEL = ['CSV'].join('');

function ClearFiltersButton({ disabled }: { disabled?: boolean }) {
  const [, setParams] = useQueryStates({
    ...createTableSearchParams([]),
    name: parseAsString
  });

  return (
    <button
      type='button'
      className='text-primary underline-offset-2 hover:underline'
      disabled={disabled}
      onClick={() => {
        void setParams({ page: 1, name: null, sort: [] });
      }}
    >
      Xóa bộ lọc
    </button>
  );
}

export function RolesTable() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [params, setParams] = useQueryStates({
    ...createTableSearchParams([]),
    name: parseAsString,
    type: parseAsString,
  });
  const [, setCreate] = useQueryState('create', parseAsString);

  const activeTab = params.type ?? 'all';
  const resolvedActiveTab: RoleTabValue =
    ROLE_TYPE_TABS.some((t) => t.value === activeTab)
      ? (activeTab as RoleTabValue)
      : 'all';

  const { data: roles = [], error, isLoading, refetch } = useQuery(rolesQueryOptions);

  const filteredRoles = React.useMemo(() => {
    let list = roles;
    if (resolvedActiveTab === 'system') {
      list = list.filter((r) => r.isSystem);
    } else if (resolvedActiveTab === 'custom') {
      list = list.filter((r) => !r.isSystem);
    }
    return list;
  }, [roles, resolvedActiveTab]);

  const pageCount = Math.max(1, Math.ceil(filteredRoles.length / params.perPage));
  const hasFilters = Boolean(params.name ?? (resolvedActiveTab !== 'all'));

  const handleRowClick = React.useCallback(
    (role: Role) => {
      router.push(`/administration/roles/${role.id}`);
    },
    [router],
  );

  const cols = React.useMemo(() => roleColumns(handleRowClick), [handleRowClick]);
  const tempColumnIds = React.useMemo(
    () => cols.map((c) => c.id).filter(Boolean) as string[],
    [cols],
  );

  const { table } = useDataTable({
    data: filteredRoles,
    columns: cols,
    pageCount,
    shallow: true,
    debounceMs: 500,
    tableId: 'roles'
  });

  if (error) {
    return (
      <QueryErrorAlert
        error={error}
        subject={errorUiCopy.subjects.rolesList}
        onRetry={() => void refetch()}
        className='rounded-2xl border-destructive/50 bg-destructive/5'
      />
    );
  }

  if (isLoading) {
    return <RolesTableSkeleton />;
  }

  const emptyState =
    !filteredRoles.length ? (
      <div className='flex flex-col items-center gap-1 py-6'>
        <p className='text-muted-foreground text-sm'>
          {hasFilters
            ? 'Không tìm thấy kết quả phù hợp'
            : 'Chưa có nhóm quyền nào'}
        </p>
        {hasFilters && <ClearFiltersButton />}
      </div>
    ) : undefined;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ willChange: 'transform, opacity' }}
      className='flex flex-1 flex-col gap-4'
    >
      <div className='flex items-center justify-between gap-4'>
        <Tabs
          value={resolvedActiveTab}
          onValueChange={(value) => {
            void setParams({ page: 1, type: value }, { shallow: true });
          }}
          className='flex flex-1'
        >
          <TabsList className='w-fit'>
            {ROLE_TYPE_TABS.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className='flex items-center gap-1.5'
                >
                  <Icon className='h-4 w-4' />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <Button
          size='sm'
          onClick={() => {
            void setCreate('true', { shallow: true });
          }}
        >
          <Icons.add className='mr-2 h-4 w-4' />
          {roleUiCopy.tabs.addRole}
        </Button>
      </div>

      <div className='flex flex-1 flex-col gap-2'>
        <DataTable
          table={table}
          emptyState={emptyState}
          isLoading={isLoading}
          animationKey={resolvedActiveTab}
        >
          <DataTableToolbar table={table}>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={filteredRoles.length === 0}
              onClick={() =>
                downloadTableAsCsv(table.getRowModel().rows, ROLE_EXPORT_FILENAME)
              }
            >
              <Icons.fileTypeXls className='mr-1.5 size-4' />
              {EXPORT_LABEL}
            </Button>
          </DataTableToolbar>
        </DataTable>
      </div>
    </motion.div>
  );
}

export function RolesTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4 rounded-2xl border border-border/60 bg-background/70 p-4'>
      <div className='flex items-center justify-between gap-4'>
        <div className='h-9 w-80 rounded-xl bg-muted' />
      </div>
      <div className='h-11 w-full rounded-xl bg-muted' />
      <div className='h-96 w-full rounded-2xl bg-muted' />
      <div className='h-10 w-full rounded-xl bg-muted' />
    </div>
  );
}
