import { redirect } from 'next/navigation';

type AdminPermissionsPageProps = {
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

/**
 * Route: /admin/permissions
 * Verified mapping: redirects to /administration/roles while preserving query parameters.
 */
export default async function AdminPermissionsPage({
  searchParams,
}: AdminPermissionsPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  redirect(buildRedirectUrl('/administration/roles', resolvedParams));
}
