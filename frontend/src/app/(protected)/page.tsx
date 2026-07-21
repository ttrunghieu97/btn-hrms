import { requireServerSession } from '@/lib/server/auth-session';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  await requireServerSession('/auth/sign-in');
  redirect('/overview');
}
