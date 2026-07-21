import { ErrorBoundary } from '@/components/error-boundary';
import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';
import { fontVariables } from '@/components/themes/font.config';
import { DEFAULT_THEME, THEMES } from '@/components/themes/theme.config';
import ThemeProvider from '@/components/themes/theme-provider';
import { brandCopy } from '@/lib/app-copy';
import { cn } from '@/lib/utils';
import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import '../styles/globals.css';

const META_THEME_COLORS = {
  light: '#ffffff',
  dark: '#09090b'
};

const themeInitScript = `
(() => {
  try {
    const root = document.documentElement;
    const stored = window.localStorage.getItem('theme');
    const cookie = document.cookie.match(/(?:^|; )theme_mode=([^;]+)/)?.[1];
    const mode = stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : cookie === 'light' || cookie === 'dark' || cookie === 'system'
        ? decodeURIComponent(cookie)
        : 'system';
    const resolved = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;

    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  } catch {}
})();`;

export const metadata: Metadata = {
  title: brandCopy.systemName,
  description: brandCopy.systemDescription,
  icons: {
    icon: '/logo-vang.png',
    shortcut: '/logo-vang.png',
    apple: '/logo-vang.png'
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: META_THEME_COLORS.light },
    { media: '(prefers-color-scheme: dark)', color: META_THEME_COLORS.dark }
  ]
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get('active_theme')?.value;
  const themeModeValue = cookieStore.get('theme_mode')?.value;
  const isValidTheme = THEMES.some((t) => t.value === activeThemeValue);
  const themeModeToApply =
    themeModeValue === 'light' || themeModeValue === 'dark' || themeModeValue === 'system'
      ? themeModeValue
      : 'system';
  const themeToApply = isValidTheme ? activeThemeValue! : DEFAULT_THEME;
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html
      lang='vi'
      suppressHydrationWarning
      data-theme={themeToApply}
      className={themeModeToApply === 'dark' ? 'dark' : undefined}
      style={themeModeToApply === 'system' ? undefined : { colorScheme: themeModeToApply }}
    >
      <head>
        <script
          id='theme-init'
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body
        className={cn(
          'bg-background overflow-x-hidden overscroll-none font-sans antialiased',
          fontVariables
        )}
      >
        <NextTopLoader color='var(--primary)' showSpinner={false} />
        <ThemeProvider
          attribute='class'
          defaultTheme={themeModeToApply}
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <NuqsAdapter>
            <ErrorBoundary feature='root-layout'>
              <Providers activeThemeValue={themeToApply}>
                <Toaster />
                {children}
              </Providers>
            </ErrorBoundary>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}

