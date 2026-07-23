import type { Row } from '@tanstack/react-table';
import type { ReactNode } from 'react';

/**
 * Client-side CSV download with BOM for Excel UTF-8 compatibility.
 * Only exports visible columns, skipping selection/action columns.
 */
export function downloadTableAsCsv<TData>(
  rows: Row<TData>[],
  filename = 'export.csv'
) {
  if (rows.length === 0) return;

  const visibleColumns = rows[0].getVisibleCells().filter((cell) => {
    const colId = cell.column.id;
    return colId !== 'select' && colId !== 'actions';
  });

  const headers = visibleColumns.map((cell) => {
    const header = cell.column.columnDef.header;
    if (typeof header === 'function') {
      const rendered = (header as (ctx: unknown) => ReactNode)({
        column: cell.column,
        header: cell.column.columnDef,
        table: cell.getContext().table
      });
      if (typeof rendered === 'string') return rendered;
      return extractTextContent(rendered);
    }
    if (typeof header === 'string') return header;
    return cell.column.id;
  });

  const dataRows = rows.map((row) =>
    visibleColumns.map((cell) => formatCsvValue(row.getValue(cell.column.id)))
  );

  const csvContent = [
    headers.map(escapeCsvField).join(','),
    ...dataRows.map((row) => row.map(escapeCsvField).join(','))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function extractTextContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextContent).join(' ');
  if (node && typeof node === 'object' && 'props' in node) {
    return extractTextContent(
      (node as { props?: { children?: ReactNode } }).props?.children
    );
  }
  return '';
}

function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const displayValue = obj.label ?? obj.name ?? obj.title;
    return typeof displayValue === 'string' ? displayValue : JSON.stringify(value);
  }
  return String(value);
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
