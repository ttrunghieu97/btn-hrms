import { redirect } from 'next/navigation';

type AdminAuditPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildRedirectUrl(
  targetPath: string,
  params?: Record<string, string | string[] | undefined>,
): string {
  if (!params) return targetPath;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined) qs.append(key, item);
      }
    } else if (value !== undefined) {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  return query ? `${targetPath}?${query}` : targetPath;
}

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  redirect(buildRedirectUrl('/administration/audit-logs', resolvedParams));
}
