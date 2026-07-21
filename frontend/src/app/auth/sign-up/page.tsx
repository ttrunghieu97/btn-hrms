import { Metadata } from 'next';
import { SignUpView } from '@/features/auth';
import { buildAuthMetadataTitle, pageCopy } from '@/lib/app-copy';

export const metadata: Metadata = {
  title: buildAuthMetadataTitle(pageCopy.auth.signUp.title),
  description: pageCopy.auth.signUp.description
};

export default async function Page() {
  return <SignUpView />;
}
