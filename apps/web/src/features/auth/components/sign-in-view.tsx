import { Suspense } from 'react';
import { appCopy, brandCopy } from '@/lib/app-copy';
import Image from 'next/image';
import { Metadata } from 'next';
import Link from 'next/link';
import { IconArrowLeft, IconShieldCheck, IconStarFilled, IconQuote } from '@tabler/icons-react';
import UserAuthForm from './user-auth-form';

export const metadata: Metadata = {
  title: appCopy.auth.metadataTitle,
  description: appCopy.auth.signIn.heroDescription
};

export default function SignInViewPage() {
  return (
    <div className='relative min-h-screen bg-[#0F0F12] text-white selection:bg-white/20 selection:text-white flex items-center justify-center p-4 md:p-8 lg:p-12'>
      {/* Background Subtle Gradient Spheres */}
      <div className='pointer-events-none absolute left-1/4 top-1/4 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/10 blur-[120px]' />
      <div className='pointer-events-none absolute right-1/4 bottom-1/4 size-[500px] translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-600/10 blur-[120px]' />

      {/* Main 2-Column Split Outer Container matching Figma Perfect UI */}
      <div className='relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#16161C]/90 shadow-2xl backdrop-blur-2xl lg:grid-cols-2'>
        
        {/* Left Column: Visual Showcase & Brand Testimonial */}
        <section className='relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1E1E28] via-[#181822] to-[#12121A] p-8 sm:p-12 lg:p-16'>
          {/* Subtle Grid Lines Overlay */}
          <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:2rem_2rem]' />

          {/* Top Brand Pill */}
          <div className='relative z-10 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex size-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md p-2 border border-white/10'>
                <Image
                  src='/logo-vang.png'
                  alt={brandCopy.companyName}
                  width={36}
                  height={36}
                  className='size-7 object-contain'
                />
              </div>
              <div>
                <p className='font-semibold text-sm tracking-tight text-white'>{brandCopy.companyName}</p>
                <p className='text-[11px] text-white/50 font-mono'>{brandCopy.shortSystemName}</p>
              </div>
            </div>
            <div className='inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-emerald-400'>
              <IconShieldCheck className='size-3.5' />
              <span>SSO Ready</span>
            </div>
          </div>

          {/* Center Showcase Artwork & Hero Headline */}
          <div className='relative z-10 my-12 space-y-6'>
            <div className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70'>
              <span className='size-2 rounded-full bg-indigo-400 animate-pulse' />
              <span>{appCopy.auth.signIn.heroBadge}</span>
            </div>
            <h1 className='text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl lg:leading-[1.15] text-white'>
              {appCopy.auth.signIn.heroTitle}
            </h1>
            <p className='text-sm leading-relaxed text-white/60 max-w-md'>
              {appCopy.auth.signIn.heroDescription}
            </p>
          </div>
        </section>

        {/* Right Column: Form Container */}
        <section className='flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-[#16161C]'>
          <div className='mx-auto w-full max-w-sm space-y-6 my-auto'>
            <div>
              <h2 className='text-2xl font-bold tracking-tight text-white sm:text-3xl'>
                {appCopy.auth.signIn.welcomeTitle}
              </h2>
              <p className='mt-2 text-xs text-white/60 leading-relaxed'>
                {appCopy.auth.signIn.welcomeDescription}
              </p>
            </div>

            <Suspense>
              <UserAuthForm />
            </Suspense>
          </div>
        </section>

      </div>
    </div>
  );
}



