import { Metadata } from 'next';
import { publicPagesCopy } from '@/locales/vi/public-pages';

export const metadata: Metadata = {
  title: publicPagesCopy.privacyPolicy.metadataTitle,
  robots: {
    index: false
  }
};

export default function PrivacyPolicyPage() {
  const { privacyPolicy } = publicPagesCopy;

  return (
    <div className='min-h-screen px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl space-y-8'>
        <h1 className='text-foreground text-3xl font-bold'>{privacyPolicy.heading}</h1>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>
            {privacyPolicy.sections.introduction.title}
          </h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            {privacyPolicy.sections.introduction.body}
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>
            {privacyPolicy.sections.dataCollection.title}
          </h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            {privacyPolicy.sections.dataCollection.body}
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>
            {privacyPolicy.sections.authentication.title}
          </h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            {privacyPolicy.sections.authentication.prefix}
            <a
              href='https://clerk.com'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary font-medium hover:underline'
            >
              {privacyPolicy.sections.authentication.clerkLabel}
            </a>
            {privacyPolicy.sections.authentication.middle}
            <a
              href='https://clerk.com/legal/privacy'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary font-medium hover:underline'
            >
              {privacyPolicy.sections.authentication.privacyPolicyLabel}
            </a>
            {privacyPolicy.sections.authentication.suffix}
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>
            {privacyPolicy.sections.noMisuse.title}
          </h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            {privacyPolicy.sections.noMisuse.body}
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>
            {privacyPolicy.sections.demo.title}
          </h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            {privacyPolicy.sections.demo.body}
          </p>
        </section>

        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>
            {privacyPolicy.sections.contact.title}
          </h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            {privacyPolicy.sections.contact.prefix}
            <a
              href={`mailto:${privacyPolicy.sections.contact.email}`}
              className='text-primary font-medium hover:underline'
            >
              {privacyPolicy.sections.contact.email}
            </a>
            {privacyPolicy.sections.contact.suffix}
          </p>
        </section>

        <div className='border-border border-t pt-4'>
          <p className='text-muted-foreground text-sm'>{privacyPolicy.lastUpdated}</p>
        </div>
      </div>
    </div>
  );
}
