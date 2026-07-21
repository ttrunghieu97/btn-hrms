'use client';

import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'ultraWide';

const BREAKPOINT_MOBILE = 768;
const BREAKPOINT_TABLET = 1024;
const BREAKPOINT_DESKTOP = 1920;

function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINT_MOBILE) return 'mobile';
  if (width < BREAKPOINT_TABLET) return 'tablet';
  if (width < BREAKPOINT_DESKTOP) return 'desktop';
  return 'ultraWide';
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('desktop');

  useEffect(() => {
    setBp(getBreakpoint(window.innerWidth));

    const handler = () => {
      setBp(getBreakpoint(window.innerWidth));
    };

    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return bp;
}

export function useIsMobile(): boolean {
  const bp = useBreakpoint();
  return bp === 'mobile';
}

export function useMediaQuery(): { isOpen: boolean } {
  const bp = useBreakpoint();
  return { isOpen: bp === 'mobile' };
}
