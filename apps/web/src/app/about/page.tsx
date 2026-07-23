import { Metadata } from 'next';
import { publicPagesCopy } from '@/locales/vi/public-pages';

export const metadata: Metadata = {
  title: publicPagesCopy.about.metadataTitle
};

export default function AboutPage() {
  const { about } = publicPagesCopy;

  return (
    <div className='min-h-screen px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl'>
        <div className='mb-12 text-center'>
          <h1 className='text-foreground text-3xl font-bold tracking-tight sm:text-4xl'>
            {about.heading}
          </h1>
          <p className='text-muted-foreground mt-4 text-lg'>{about.description}</p>
        </div>

        <div className='space-y-8'>
          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>
              {about.sections.openSource.title}
            </h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              {about.sections.openSource.body}
            </p>
          </section>

          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>
              {about.sections.demoPurpose.title}
            </h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              {about.sections.demoPurpose.body}
            </p>
          </section>

          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>
              {about.sections.authentication.title}
            </h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              {about.sections.authentication.prefix}
              <a
                href='https://clerk.com'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary font-medium hover:underline'
              >
                {about.sections.authentication.linkLabel}
              </a>
              {about.sections.authentication.suffix}
            </p>
          </section>

          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>
              {about.sections.privacy.title}
            </h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              {about.sections.privacy.body}
            </p>
          </section>
        </div>

        <div className='mt-12 text-center'>
          <p className='text-muted-foreground text-sm'>{about.footer}</p>
        </div>
      </div>
    </div>
  );
}
