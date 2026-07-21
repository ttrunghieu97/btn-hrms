import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { appCopy, brandCopy } from '@/lib/app-copy';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  IconArrowRight,
  IconBuildingCommunity,
  IconClockHour4,
  IconShieldCheck
} from '@tabler/icons-react';
import { InteractiveGridPattern } from './interactive-grid';
import UserAuthForm from './user-auth-form';

export const metadata: Metadata = {
  title: appCopy.auth.metadataTitle,
  description: appCopy.auth.signIn.heroDescription
};

export default function SignInViewPage() {
  return (
    <div className='relative min-h-screen overflow-hidden bg-[linear-gradient(160deg,oklch(0.985_0.006_30)_0%,oklch(0.985_0.006_30)_48%,oklch(0.97_0.008_30)_100%)]'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.88_0.04_28_/_0.25),transparent_32%),radial-gradient(circle_at_bottom_right,oklch(0.75_0.08_50_/_0.18),transparent_28%)]' />
      <Link
        href='/'
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 right-4 z-20 hidden md:top-8 md:right-8 md:inline-flex'
        )}
      >
        {appCopy.auth.signIn.backHome}
      </Link>
      <div className='relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-4 py-6 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-10'>
        <section className='relative hidden overflow-hidden rounded-[2rem] border border-white/40 bg-gradient-to-br from-primary/5 via-background to-secondary/30 px-8 py-10 text-foreground shadow-2xl lg:flex lg:min-h-[720px] lg:flex-col'>
          <div className='relative z-10 flex items-center justify-between'>
            <div>
              <div className='flex items-center gap-4'>
                <div className='flex size-16 items-center justify-center rounded-2xl bg-primary/10'>
                  <Image
                    src='/logo-vang.png'
                    alt={brandCopy.companyName}
                    width={48}
                    height={48}
                    className='h-12 w-12 object-contain'
                  />
                </div>
                <p className='text-sm uppercase tracking-[0.28em] text-muted-foreground'>
                  {brandCopy.shortSystemName}
                </p>
              </div>
              <h1 className='mt-4 max-w-xl text-4xl font-semibold leading-tight text-balance'>
                {appCopy.auth.signIn.heroTitle}
              </h1>
            </div>
            <Badge variant='secondary' className='border-primary/10 bg-primary/5 text-primary'>
              {appCopy.auth.signIn.heroBadge}
            </Badge>
          </div>
          <p className='relative z-10 mt-6 max-w-xl text-base leading-7 text-muted-foreground'>
            {appCopy.auth.signIn.heroDescription}
          </p>
          <InteractiveGridPattern
            className={cn(
              'mask-[radial-gradient(520px_circle_at_40%_40%,white,transparent)] opacity-40',
              'inset-x-0 inset-y-[-10%] h-[120%] skew-y-6'
            )}
          />
          <div className='relative z-10 mt-auto grid gap-4 md:grid-cols-3'>
            <div className='rounded-2xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm'>
              <IconClockHour4 className='mb-6 h-5 w-5 text-chart-1' />
              <p className='text-sm font-medium'>{appCopy.auth.signIn.highlights.dailyVisibility.title}</p>
              <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                {appCopy.auth.signIn.highlights.dailyVisibility.description}
              </p>
            </div>
            <div className='rounded-2xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm'>
              <IconShieldCheck className='mb-6 h-5 w-5 text-chart-3' />
              <p className='text-sm font-medium'>{appCopy.auth.signIn.highlights.protectedSessions.title}</p>
              <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                {appCopy.auth.signIn.highlights.protectedSessions.description}
              </p>
            </div>
            <div className='rounded-2xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm'>
              <IconBuildingCommunity className='mb-6 h-5 w-5 text-chart-2' />
              <p className='text-sm font-medium'>{appCopy.auth.signIn.highlights.operationalAlignment.title}</p>
              <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                {appCopy.auth.signIn.highlights.operationalAlignment.description}
              </p>
            </div>
          </div>
        </section>

        <section className='flex items-center justify-center py-10 lg:py-0'>
          <div className='w-full max-w-xl'>
            <div className='mb-6 flex items-center justify-between lg:hidden'>
              <div className='flex items-center gap-3'>
                <div className='flex size-10 items-center justify-center rounded-xl bg-primary/10'>
                  <Image
                    src='/logo-vang.png'
                    alt={brandCopy.companyName}
                    width={24}
                    height={24}
                    className='size-6 object-contain'
                  />
                </div>
                <div>
                  <p className='text-muted-foreground text-xs uppercase tracking-[0.28em]'>
                    {brandCopy.shortSystemName}
                  </p>
                  <p className='mt-1 text-lg font-semibold'>{appCopy.auth.signIn.mobileTitle}</p>
                </div>
              </div>
              <Badge variant='outline'>{appCopy.auth.signIn.mobileBadge}</Badge>
            </div>
            <Card className='overflow-hidden border-border/60 bg-background/80 py-0 shadow-2xl backdrop-blur-xl'>
              <CardContent className='grid gap-0 p-0'>
                <div className='border-b border-border/50 px-6 py-6 sm:px-8'>
                  <Badge variant='outline' className='mb-4 rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-primary'>
                    {appCopy.auth.signIn.portalBadge}
                  </Badge>
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <h2 className='text-3xl font-semibold tracking-tight'>{appCopy.auth.signIn.welcomeTitle}</h2>
                      <p className='text-muted-foreground mt-2 max-w-md text-sm leading-6'>
                        {appCopy.auth.signIn.welcomeDescription}
                      </p>
                    </div>
                    <div className='hidden rounded-2xl border border-border/60 bg-muted/30 p-3 text-muted-foreground sm:block'>
                      <IconArrowRight className='h-5 w-5' />
                    </div>
                  </div>
                </div>
                <div className='px-6 py-6 sm:px-8'>
                  <Suspense><UserAuthForm /></Suspense>
                </div>
                <div className='bg-muted/20 px-6 py-5 text-sm sm:px-8'>
                  <div className='flex flex-col gap-2 text-muted-foreground sm:flex-row sm:items-center sm:justify-between'>
                    <p>{appCopy.auth.signIn.helpText}</p>
                    <div className='flex gap-4'>
                      <Link
                        href='/privacy-policy'
                        className='font-medium text-foreground underline-offset-4 hover:underline'
                      >
                        {appCopy.auth.signIn.privacy}
                      </Link>
                      <Link
                        href='/terms-of-service'
                        className='font-medium text-foreground underline-offset-4 hover:underline'
                      >
                        {appCopy.auth.signIn.terms}
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
