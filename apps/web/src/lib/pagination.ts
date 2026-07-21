import { parseAsInteger } from 'nuqs/server';
import { getSortingStateParser } from '@/lib/parsers';

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 200,
} as const;

export const pageParser = parseAsInteger.withDefault(1);
export const perPageParser = parseAsInteger
  .withDefault(PAGINATION.DEFAULT_PAGE_SIZE)
  .withOptions({ clearOnDefault: true });

export const limitParser = parseAsInteger
  .withDefault(PAGINATION.DEFAULT_PAGE_SIZE)
  .withOptions({ clearOnDefault: true });

export function createTableSearchParams(columnIds?: readonly string[]) {
  return {
    page: pageParser,
    perPage: perPageParser,
    sort: getSortingStateParser(columnIds ? [...columnIds] : undefined).withDefault([]),
  };
}
