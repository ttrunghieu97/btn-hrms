import { Icons } from '@/components/icons';

import { commonUiCopy } from '@/lib/app-copy';
import { cn } from '@/lib/utils';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Icons.spinner
      role='status'
      aria-label={commonUiCopy.loadingLabel}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
