export interface StandardAllowanceSuggestion {
  jobTitle: string;
  type: 'position';
  amount: number;
  label: string;
  note: string;
}

export const POSITION_STANDARDS: Record<string, { amount: number; label: string; note: string }> = {
  'tổ trưởng': {
    amount: 1000.00,
    label: 'Chuẩn chức danh Tổ trưởng',
    note: 'Phụ cấp chức vụ Tổ trưởng',
  },
  'tổ phó': {
    amount: 600.00,
    label: 'Chuẩn chức danh Tổ phó',
    note: 'Phụ cấp chức vụ Tổ phó',
  },
  'phó phòng': {
    amount: 800.00,
    label: 'Chuẩn chức danh Phó phòng',
    note: 'Phụ cấp trách nhiệm Phó phòng',
  },
  'trưởng phòng': {
    amount: 1500.00,
    label: 'Chuẩn chức danh Trưởng phòng',
    note: 'Phụ cấp chức vụ Trưởng phòng',
  },
  'trưởng nhóm': {
    amount: 1000.00,
    label: 'Chuẩn chức danh Trưởng nhóm',
    note: 'Phụ cấp trách nhiệm Trưởng nhóm',
  },
};

export function getStandardAllowanceSuggestion(
  jobTitle?: string | null,
): StandardAllowanceSuggestion | null {
  if (!jobTitle) return null;
  const normalized = jobTitle.trim().toLowerCase();

  for (const [key, standard] of Object.entries(POSITION_STANDARDS)) {
    if (normalized.includes(key)) {
      return {
        jobTitle,
        type: 'position',
        amount: standard.amount,
        label: standard.label,
        note: standard.note,
      };
    }
  }

  return null;
}

export const ALLOWANCE_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; badgeVariant?: 'default' | 'secondary' | 'outline' }
> = {
  position: {
    label: 'Chức vụ / Trách nhiệm',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-300 dark:border-purple-800',
  },
  salary: {
    label: 'Theo lương',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 dark:border-blue-800',
  },
  seniority: {
    label: 'Thâm niên',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  },
  professional_seniority: {
    label: 'Thâm niên nghề',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  },
  additional: {
    label: 'Đãi ngộ khác',
    color: 'bg-muted text-muted-foreground border-border',
  },
};
