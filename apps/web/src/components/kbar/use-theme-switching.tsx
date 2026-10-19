import { useRegisterActions } from 'kbar';
import { useTheme } from '@/components/themes/theme-provider';
import { useThemeConfig } from '@/components/themes/active-theme';
import { THEMES } from '@/components/themes/theme.config';

const useThemeSwitching = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const { setActiveTheme } = useThemeConfig();

  const toggleDarkLight = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const themeActions = [
    {
      id: 'toggleDarkLight',
      name: 'Chuyển đổi Sáng / Tối (Toggle Dark/Light)',
      shortcut: ['d', 'd'],
      section: 'Theme',
      perform: toggleDarkLight
    },
    {
      id: 'setLightTheme',
      name: 'Giao diện Sáng (Light Mode)',
      section: 'Theme',
      perform: () => setTheme('light')
    },
    {
      id: 'setDarkTheme',
      name: 'Giao diện Tối (Dark Mode)',
      section: 'Theme',
      perform: () => setTheme('dark')
    },
    {
      id: 'setSystemTheme',
      name: 'Theo hệ thống (System Mode)',
      section: 'Theme',
      perform: () => setTheme('system')
    },
    ...THEMES.map((palette) => ({
      id: `setPalette-${palette.value}`,
      name: `Bảng màu: ${palette.name}`,
      section: 'Theme',
      perform: () => setActiveTheme(palette.value)
    }))
  ];

  useRegisterActions(themeActions, [resolvedTheme]);
};

export default useThemeSwitching;
