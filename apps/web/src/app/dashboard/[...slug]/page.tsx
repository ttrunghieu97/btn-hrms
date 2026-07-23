import { redirect } from 'next/navigation';

export default async function DashboardSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const slug = (await params).slug;
  redirect('/' + slug.join('/'));
}
