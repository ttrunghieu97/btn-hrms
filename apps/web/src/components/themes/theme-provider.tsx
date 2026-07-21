'use client';

import * as React from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';
type Attribute = 'class' | `data-${string}`;

export type ThemeProviderProps = React.PropsWithChildren<{
  themes?: string[];
  forcedTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
  storageKey?: string;
  defaultTheme?: string;
  attribute?: Attribute | Attribute[];
  value?: Record<string, string>;
}>;

type UseThemeProps = {
  themes: string[];
  forcedTheme?: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  theme?: string;
  resolvedTheme?: ResolvedTheme;
  systemTheme?: ResolvedTheme;
};

const STORAGE_KEY_FALLBACK = 'theme';
const COOKIE_NAME = 'theme_mode';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';
const DEFAULT_THEMES = ['light', 'dark'];
const ThemeContext = React.createContext<UseThemeProps | undefined>(undefined);

function isThemeMode(value: string | undefined): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function getSystemTheme() {
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

function setThemeCookie(theme: string) {
  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax; ${
    window.location.protocol === 'https:' ? 'Secure;' : ''
  }`;
}

function disableTransitionsTemporarily() {
  const style = document.createElement('style');
  style.appendChild(
    document.createTextNode(
      '*,*::before,*::after{-webkit-transition:none!important;transition:none!important}'
    )
  );
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    window.setTimeout(() => {
      document.head.removeChild(style);
    }, 1);
  };
}

function applyThemeToDom({
  theme,
  attribute,
  enableColorScheme,
  value
}: {
  theme: ThemeMode;
  attribute: Attribute | Attribute[];
  enableColorScheme: boolean;
  value?: Record<string, string>;
}) {
  const root = document.documentElement;
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  const attributes = Array.isArray(attribute) ? attribute : [attribute];

  for (const item of attributes) {
    if (item === 'class') {
      root.classList.toggle('dark', resolvedTheme === 'dark');
      continue;
    }

    const nextValue = value?.[resolvedTheme] ?? resolvedTheme;
    root.setAttribute(item, nextValue);
  }

  if (enableColorScheme) {
    root.style.colorScheme = resolvedTheme;
  } else {
    root.style.removeProperty('color-scheme');
  }
}

export function useTheme() {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

export default function ThemeProvider({
  children,
  themes = DEFAULT_THEMES,
  forcedTheme,
  enableSystem = true,
  disableTransitionOnChange = false,
  enableColorScheme = true,
  storageKey = STORAGE_KEY_FALLBACK,
  defaultTheme = enableSystem ? 'system' : 'light',
  attribute = 'class',
  value
}: ThemeProviderProps) {
  const initialTheme = isThemeMode(forcedTheme)
    ? forcedTheme
    : isThemeMode(defaultTheme)
      ? defaultTheme
      : enableSystem
        ? 'system'
        : 'light';

  const [theme, setThemeState] = React.useState<ThemeMode>(initialTheme);
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>('light');

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(MEDIA_QUERY);
    const handleMediaChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    handleMediaChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }

    mediaQuery.addListener(handleMediaChange);
    return () => mediaQuery.removeListener(handleMediaChange);
  }, []);

  React.useEffect(() => {
    if (forcedTheme && isThemeMode(forcedTheme)) {
      setThemeState(forcedTheme);
      return;
    }

    try {
      const storedTheme = window.localStorage.getItem(storageKey);
      if (isThemeMode(storedTheme ?? undefined) && storedTheme) {
        setThemeState(storedTheme as ThemeMode);
      }
    } catch {
      // Ignore storage access failures.
    }
  }, [forcedTheme, storageKey]);

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key !== storageKey ||
        !isThemeMode(event.newValue ?? undefined) ||
        !event.newValue
      ) {
        return;
      }

      setThemeState(event.newValue as ThemeMode);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [storageKey]);

  React.useLayoutEffect(() => {
    const nextTheme = forcedTheme && isThemeMode(forcedTheme) ? forcedTheme : theme;
    const cleanup = disableTransitionOnChange ? disableTransitionsTemporarily() : undefined;

    applyThemeToDom({
      theme: nextTheme,
      attribute,
      enableColorScheme,
      value
    });

    cleanup?.();
  }, [attribute, disableTransitionOnChange, enableColorScheme, forcedTheme, theme, value]);

  const setTheme = React.useCallback<React.Dispatch<React.SetStateAction<string>>>(
    (valueOrUpdater) => {
      if (forcedTheme) return;

      setThemeState((current) => {
        const nextValue =
          typeof valueOrUpdater === 'function' ? valueOrUpdater(current) : valueOrUpdater;
        const nextTheme = isThemeMode(nextValue) ? nextValue : current;

        try {
          window.localStorage.setItem(storageKey, nextTheme);
        } catch {
          // Ignore storage access failures.
        }

        setThemeCookie(nextTheme);
        return nextTheme;
      });
    },
    [forcedTheme, storageKey]
  );

  const resolvedTheme = theme === 'system' ? systemTheme : theme;
  const contextValue = React.useMemo<UseThemeProps>(
    () => ({
      theme,
      setTheme,
      forcedTheme,
      resolvedTheme,
      systemTheme: enableSystem ? systemTheme : undefined,
      themes: enableSystem ? [...themes, 'system'] : themes
    }),
    [enableSystem, forcedTheme, resolvedTheme, setTheme, systemTheme, theme, themes]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}
