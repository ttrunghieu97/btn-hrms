import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Section({ title, description, children, className }: SectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {title && (
        <div className='flex flex-col gap-1'>
          <h2 className='text-lg font-semibold tracking-tight'>{title}</h2>
          {description && <p className='text-muted-foreground text-sm'>{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
