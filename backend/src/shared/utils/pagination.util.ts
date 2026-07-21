export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    data,
    meta: {
      pagination: {
        total,
        page,
        limit,
        hasNext: page * limit < total,
      },
    },
  };
}
