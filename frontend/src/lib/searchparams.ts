import {
  createSearchParamsCache,
  createSerializer,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString
} from 'nuqs/server';
import { perPageParser, pageParser } from '@/lib/pagination';

export const searchParams = {
  page: pageParser,
  perPage: perPageParser,
  name: parseAsString,
  search: parseAsString,
  date: parseAsString,
  gender: parseAsString,
  category: parseAsString,
  role: parseAsString,
  month: parseAsString,
  sort: parseAsString,
  status: parseAsString,
  tab: parseAsString,
  departmentIds: parseAsArrayOf(parseAsString, ',')
};

export const searchParamsCache = createSearchParamsCache(searchParams);
export const serialize = createSerializer(searchParams);
