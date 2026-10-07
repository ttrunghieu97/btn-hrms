import { requireServerSession } from '@/lib/server/auth-session';
import { redirect } from 'next/navigation';
import { getPreferredLandingRoute } from '@/lib/auth-landing';

export default async function Dashboard() {
  const user = await requireServerSession('/auth/sign-in');
  redirect(getPreferredLandingRoute(user));
}

