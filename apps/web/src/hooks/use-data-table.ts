'use client';

import {
  type ColumnFiltersState,
  type ColumnPinningState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  type Updater,
  type VisibilityState,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import {
  type Parser,
  type UseQueryStateOptions,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryState,
  useQueryStates
} from 'nuqs';
import * as React from 'react';

import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { getSortingStateParser } from '@/lib/parsers';
import type { ExtendedColumnSort } from '@/types/data-table';
import { pageParser, perPageParser } from '@/lib/pagination';

const PAGE_KEY = 'page';
const PER_PAGE_KEY = 'perPage';
const SORT_KEY = 'sort';
const ARRAY_SEPARATOR = ',';
const DEBOUNCE_MS = 300;
const THROTTLE_MS = 50;
const COLUMN_VISIBILITY_STORAGE_PREFIX = 'table_columns_';

interface UseDataTableProps<TData>
  extends
    Omit<
      TableOptions<TData>,
      | 'state'
      | 'pageCount'
      | 'getCoreRowModel'
      | 'manualFiltering'
      | 'manualPagination'
      | 'manualSorting'
    >,
    Required<Pick<TableOptions<TData>, 'pageCount'>> {
  initialState?: Omit<Partial<TableState>, 'sorting'> & {
    sorting?: ExtendedColumnSort<TData>[];
  };
  history?: 'push' | 'replace';
  debounceMs?: number;
  throttleMs?: number;
  clearOnDefault?: boolean;
  enableAdvancedFilter?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  startTransition?: React.TransitionStartFunction;
  tableId?: string;
}

function getColumnId(column: { id?: string; accessorKey?: unknown }): string | undefined {
  if (typeof column.id === 'string' && column.id.length > 0) {
    return column.id;
  }
  if (typeof column.accessorKey === 'string' && column.accessorKey.length > 0) {
    return column.accessorKey;
  }
  return undefined;
}

export function useDataTable<TData>(props: UseDataTableProps<TData>) {
  const {
    columns,
    pageCount = -1,
    initialState,
    history = 'replace',
    debounceMs = DEBOUNCE_MS,
    throttleMs = THROTTLE_MS,
    clearOnDefault = false,
    enableAdvancedFilter = false,
    scroll = false,
    shallow = true,
    startTransition,
    tableId,
    ...tableProps
  } = props;

  const queryStateOptions = React.useMemo<Omit<UseQueryStateOptions<string>, 'parse'>>(
    () => ({
      history,
      scroll,
      shallow,
      throttleMs,
      debounceMs,
      clearOnDefault,
      startTransition
    }),
    [history, scroll, shallow, throttleMs, debounceMs, clearOnDefault, startTransition]
  );

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {}
  );
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialState?.columnVisibility ?? {}
  );
  const [columnSizing, setColumnSizing] = React.useState<Record<string, number>>(
    initialState?.columnSizing ?? {}
  );
  const hydratedTableIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!tableId) return;
    try {
      const savedVisibility = localStorage.getItem(`${COLUMN_VISIBILITY_STORAGE_PREFIX}${tableId}`);
      if (savedVisibility) {
        const parsed = JSON.parse(savedVisibility) as VisibilityState;
        const validIds = new Set(
          columns.map((c) => getColumnId(c)).filter(Boolean) as string[]
        );
        const clean = Object.fromEntries(
          Object.entries(parsed).filter(([key]) => validIds.has(key))
        );
        setColumnVisibility(clean);
      }
      const savedSizing = localStorage.getItem(`table_sizing_${tableId}`);
      if (savedSizing) {
        setColumnSizing(JSON.parse(savedSizing) as Record<string, number>);
      }
    } catch {
      /* ignore */
    } finally {
      hydratedTableIdRef.current = tableId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  React.useEffect(() => {
    if (!tableId) return;
    if (hydratedTableIdRef.current !== tableId) return;
    const validIds = new Set(columns.map((c) => getColumnId(c)).filter(Boolean) as string[]);
    const clean = Object.fromEntries(
      Object.entries(columnVisibility).filter(([key]) => validIds.has(key))
    );
    try {
      localStorage.setItem(`${COLUMN_VISIBILITY_STORAGE_PREFIX}${tableId}`, JSON.stringify(clean));
    } catch {
      /* ignore */
    }
  }, [tableId, columnVisibility, columns]);

  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    initialState?.columnPinning ?? {}
  );

  React.useEffect(() => {
    if (!tableId || Object.keys(columnSizing).length === 0) return;
    try {
      localStorage.setItem(`table_sizing_${tableId}`, JSON.stringify(columnSizing));
    } catch {
      /* ignore */
    }
  }, [tableId, columnSizing]);

  const [paginationParams, setPaginationParams] = useQueryStates(
    {
      page: pageParser,
      perPage: perPageParser,
    },
    queryStateOptions
  );

  const pagination: PaginationState = React.useMemo(() => {
    return {
      pageIndex: paginationParams.page - 1, // zero-based index -> one-based index
      pageSize: paginationParams.perPage
    };
  }, [paginationParams]);

  const onPaginationChange = React.useCallback(
    (updaterOrValue: Updater<PaginationState>) => {
      const next =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(pagination)
          : updaterOrValue;
      void setPaginationParams({
        page: next.pageIndex + 1,
        perPage: next.pageSize,
      });
    },
    [pagination, setPaginationParams]
  );

  const columnIds = React.useMemo(() => {
    return new Set(columns.map((column) => getColumnId(column)).filter(Boolean) as string[]);
  }, [columns]);

  const [sorting, setSorting] = useQueryState(
    SORT_KEY,
    getSortingStateParser<TData>(columnIds)
      .withOptions(queryStateOptions)
      .withDefault(initialState?.sorting ?? [])
  );

  const onSortingChange = React.useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      if (typeof updaterOrValue === 'function') {
        const newSorting = updaterOrValue(sorting);
        setSorting(newSorting as ExtendedColumnSort<TData>[]);
      } else {
        setSorting(updaterOrValue as ExtendedColumnSort<TData>[]);
      }
    },
    [sorting, setSorting]
  );

  const filterableColumns = React.useMemo(() => {
    if (enableAdvancedFilter) return [];

    return columns.filter((column) => column.enableColumnFilter);
  }, [columns, enableAdvancedFilter]);

  const filterParsers = React.useMemo(() => {
    if (enableAdvancedFilter) return {};

    return filterableColumns.reduce<Record<string, Parser<string> | Parser<string[]>>>(
      (acc, column) => {
        const colId = getColumnId(column) ?? '';
        if (!colId) return acc;
        if (column.meta?.options) {
          acc[colId] = parseAsArrayOf(parseAsString, ARRAY_SEPARATOR).withOptions(
            queryStateOptions
          );
        } else {
          acc[colId] = parseAsString.withOptions(queryStateOptions);
        }
        return acc;
      },
      {}
    );
  }, [filterableColumns, queryStateOptions, enableAdvancedFilter]);

  const [filterValues, setFilterValues] = useQueryStates(filterParsers);

  const debouncedSetFilterValues = useDebouncedCallback((values: typeof filterValues) => {
    void setPaginationParams({ page: 1, perPage: paginationParams.perPage });
    void setFilterValues(values);
  }, debounceMs);

  const initialColumnFilters: ColumnFiltersState = React.useMemo(() => {
    if (enableAdvancedFilter) return [];

    return Object.entries(filterValues).reduce<ColumnFiltersState>((filters, [key, value]) => {
      if (value !== null) {
        const columnDef = filterableColumns.find((col) => getColumnId(col) === key);
        const expectsArray = Boolean(
          columnDef?.meta?.options ||
            columnDef?.meta?.variant === 'select' ||
            columnDef?.meta?.variant === 'multiSelect' ||
            columnDef?.meta?.variant === 'range' ||
            columnDef?.meta?.variant === 'dateRange'
        );
        const processedValue = Array.isArray(value)
          ? value
          : expectsArray
            ? [value]
            : value;

        filters.push({
          id: key,
          value: processedValue
        });
      }
      return filters;
    }, []);
  }, [filterValues, enableAdvancedFilter, filterableColumns]);

  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>(initialColumnFilters);
  const columnFiltersRef = React.useRef<ColumnFiltersState>(initialColumnFilters);
  columnFiltersRef.current = columnFilters;

  const onColumnFiltersChange = React.useCallback(
    (updaterOrValue: Updater<ColumnFiltersState>) => {
      if (enableAdvancedFilter) return;

      const prev = columnFiltersRef.current;
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;

      columnFiltersRef.current = next;
      setColumnFilters(next);

      const filterUpdates = next.reduce<Record<string, string | string[] | null>>(
        (acc, filter) => {
          if (filterableColumns.find((column) => getColumnId(column) === filter.id)) {
            acc[filter.id] = filter.value as string | string[];
          }
          return acc;
        },
        {}
      );

      for (const prevFilter of prev) {
        if (!next.some((filter) => filter.id === prevFilter.id)) {
          filterUpdates[prevFilter.id] = null;
        }
      }

      debouncedSetFilterValues(filterUpdates);
    },
    [debouncedSetFilterValues, filterableColumns, enableAdvancedFilter]
  );

  const table = useReactTable({
    ...tableProps,
    columns,
    initialState,
    pageCount,
    state: {
      pagination,
      sorting,
      columnVisibility,
      columnPinning,
      rowSelection,
      columnFilters,
      columnSizing
    },
    defaultColumn: {
      ...tableProps.defaultColumn,
      enableColumnFilter: false
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true
  });

  return { table, shallow, debounceMs, throttleMs };
}
