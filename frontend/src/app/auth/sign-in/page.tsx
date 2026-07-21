import { Metadata } from 'next';
import { SignInViewPage } from '@/features/auth';
import { buildAuthMetadataTitle, pageCopy } from '@/lib/app-copy';

export const metadata: Metadata = {
  title: buildAuthMetadataTitle(pageCopy.auth.signIn.title),
  description: pageCopy.auth.signIn.description
};

export default async function Page() {
  return <SignInViewPage />;
}
