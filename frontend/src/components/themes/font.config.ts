import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';

import { cn } from '@/lib/utils';

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans'
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
});

const fontSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-serif'
});

export const fontVariables = cn(
  fontSans.variable,
  fontMono.variable,
  fontSerif.variable
);
