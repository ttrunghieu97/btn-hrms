import type { Metadata } from 'next';
import { publicPagesCopy } from '@/locales/vi/public-pages';

export const metadata: Metadata = {
  title: publicPagesCopy.termsOfService.metadataTitle,
  robots: {
    index: false
  }
};

export default function TermsOfServicePage() {
  const { termsOfService } = publicPagesCopy;

  return (
    <div className='min-h-screen px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl space-y-8'>
        <div className='text-center'>
          <h1 className='text-foreground text-3xl font-bold'>{termsOfService.heading}</h1>
          <p className='text-muted-foreground mt-2 text-sm'>
            {termsOfService.lastUpdatedLabel}{' '}
            {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>
            {termsOfService.sections.introduction.title}
          </h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            {termsOfService.sections.introduction.body}
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>
            {termsOfService.sections.demoPurpose.title}
          </h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            {termsOfService.sections.demoPurpose.body}
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>
            {termsOfService.sections.openSource.title}
          </h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            {termsOfService.sections.openSource.body}
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>
            {termsOfService.sections.noWarranty.title}
          </h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            {termsOfService.sections.noWarranty.body}
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>
            {termsOfService.sections.dataUsage.title}
          </h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            {termsOfService.sections.dataUsage.body}
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>
            {termsOfService.sections.changes.title}
          </h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            {termsOfService.sections.changes.body}
          </p>
        </section>

        <section className='border-border border-t pt-4'>
          <p className='text-muted-foreground text-center text-sm'>{termsOfService.contact}</p>
        </section>
      </div>
    </div>
  );
}
