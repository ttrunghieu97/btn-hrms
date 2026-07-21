export const TAB_FIELDS: Record<string, string[]> = {
  overview: ['lastName', 'firstName', 'dob', 'gender', 'identityNumber', 'identityDate', 'identityPlace', 'email', 'phoneNumber', 'address'],
  employment: ['username', 'employeeCode', 'departmentId', 'positionId', 'status', 'startDate', 'endDate'],
  documents: ['certifications'],
};

export function findFirstErrorTab(errors: Record<string, string>): string | null {
  for (const [tab, fields] of Object.entries(TAB_FIELDS)) {
    if (fields.some((f) => errors[f])) return tab;
  }
  return null;
}

export function getTabErrorCounts(errors: Record<string, string>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [tab, fields] of Object.entries(TAB_FIELDS)) {
    const count = fields.filter((f) => errors[f]).length;
    if (count > 0) counts[tab] = count;
  }
  return counts;
}
