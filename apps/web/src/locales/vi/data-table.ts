export const dataTableConfig = {
  textOperators: [
    { label: 'Chứa', value: 'iLike' as const },
    { label: 'Không chứa', value: 'notILike' as const },
    { label: 'Bằng', value: 'eq' as const },
    { label: 'Không bằng', value: 'ne' as const },
    { label: 'Để trống', value: 'isEmpty' as const },
    { label: 'Không để trống', value: 'isNotEmpty' as const }
  ],
  numericOperators: [
    { label: 'Bằng', value: 'eq' as const },
    { label: 'Không bằng', value: 'ne' as const },
    { label: 'Nhỏ hơn', value: 'lt' as const },
    { label: 'Nhỏ hơn hoặc bằng', value: 'lte' as const },
    { label: 'Lớn hơn', value: 'gt' as const },
    { label: 'Lớn hơn hoặc bằng', value: 'gte' as const },
    { label: 'Nằm trong khoảng', value: 'isBetween' as const },
    { label: 'Để trống', value: 'isEmpty' as const },
    { label: 'Không để trống', value: 'isNotEmpty' as const }
  ],
  dateOperators: [
    { label: 'Bằng', value: 'eq' as const },
    { label: 'Không bằng', value: 'ne' as const },
    { label: 'Trước', value: 'lt' as const },
    { label: 'Sau', value: 'gt' as const },
    { label: 'Trước hoặc bằng', value: 'lte' as const },
    { label: 'Sau hoặc bằng', value: 'gte' as const },
    { label: 'Nằm trong khoảng', value: 'isBetween' as const },
    { label: 'Tương đối với hôm nay', value: 'isRelativeToToday' as const },
    { label: 'Để trống', value: 'isEmpty' as const },
    { label: 'Không để trống', value: 'isNotEmpty' as const }
  ],
  selectOperators: [
    { label: 'Bằng', value: 'eq' as const },
    { label: 'Không bằng', value: 'ne' as const },
    { label: 'Để trống', value: 'isEmpty' as const },
    { label: 'Không để trống', value: 'isNotEmpty' as const }
  ],
  multiSelectOperators: [
    { label: 'Chứa một trong các giá trị', value: 'inArray' as const },
    { label: 'Không chứa giá trị nào', value: 'notInArray' as const },
    { label: 'Để trống', value: 'isEmpty' as const },
    { label: 'Không để trống', value: 'isNotEmpty' as const }
  ],
  booleanOperators: [
    { label: 'Bằng', value: 'eq' as const },
    { label: 'Không bằng', value: 'ne' as const }
  ],
  sortOrders: [
    { label: 'Tăng dần', value: 'asc' as const },
    { label: 'Giảm dần', value: 'desc' as const }
  ],
  filterVariants: [
    'text',
    'number',
    'range',
    'date',
    'dateRange',
    'boolean',
    'select',
    'multiSelect'
  ] as const,
  operators: [
    'iLike',
    'notILike',
    'eq',
    'ne',
    'inArray',
    'notInArray',
    'isEmpty',
    'isNotEmpty',
    'lt',
    'lte',
    'gt',
    'gte',
    'isBetween',
    'isRelativeToToday'
  ] as const,
  joinOperators: ['and', 'or'] as const
};

export const dataTableFilterCopy = {
  from: 'Từ',
  to: 'Đến',
  clear: 'Xóa',
  clearFilter: (title?: string) => `Xóa bộ lọc ${title ?? ''}`.trim(),
  sliderLabel: (title?: string) => `${title ?? 'Bộ lọc'} thanh chọn`
} as const;

export type DataTableConfig = typeof dataTableConfig;
