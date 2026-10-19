'use client';
import { navGroups } from '@/config/nav-config';
import { useNav } from '@/features/nav';
import { KBarAnimator, KBarPortal, KBarPositioner, KBarProvider, KBarSearch } from 'kbar';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import RenderResults from './render-result';
import useThemeSwitching from './use-theme-switching';
import { useFilteredNavGroups } from '@/hooks/use-nav';

export default function KBar({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: serverNavGroups } = useNav();
  const filteredGroups = useFilteredNavGroups(navGroups);

  // These actions are for navigation — prefer server-driven useNav() groups (matching AppSidebar)
  const actions = useMemo(() => {
    const navigateTo = (url: string) => {
      router.push(url);
    };

    if (serverNavGroups && serverNavGroups.length > 0) {
      return serverNavGroups.flatMap((group) =>
        group.items.flatMap((navItem) => {
          const baseAction =
            navItem.href && navItem.href !== '#' && navItem.state !== 'disabled'
              ? {
                  id: `nav-${navItem.id}`,
                  name: navItem.label,
                  keywords: `${navItem.label} ${group.label}`.toLowerCase(),
                  section: group.label || 'Navigation',
                  subtitle: `Go to ${navItem.label}`,
                  perform: () => navigateTo(navItem.href)
                }
              : null;

          const childActions =
            navItem.children
              ?.filter((child) => child.href && child.href !== '#' && child.state !== 'disabled')
              .map((childItem) => ({
                id: `nav-${childItem.id}`,
                name: childItem.label,
                keywords: `${childItem.label} ${navItem.label}`.toLowerCase(),
                section: navItem.label,
                subtitle: `Go to ${childItem.label}`,
                perform: () => navigateTo(childItem.href)
              })) ?? [];

          return baseAction ? [baseAction, ...childActions] : childActions;
        })
      );
    }

    const allItems = filteredGroups.flatMap((group) => group.items);

    return allItems.flatMap((navItem) => {
      const baseAction =
        navItem.url !== '#'
          ? {
              id: `${navItem.title.toLowerCase()}Action`,
              name: navItem.title,
              shortcut: navItem.shortcut,
              keywords: navItem.title.toLowerCase(),
              section: 'Navigation',
              subtitle: `Go to ${navItem.title}`,
              perform: () => navigateTo(navItem.url)
            }
          : null;

      const childActions =
        navItem.items?.map((childItem) => ({
          id: `${childItem.title.toLowerCase()}Action`,
          name: childItem.title,
          shortcut: childItem.shortcut,
          keywords: childItem.title.toLowerCase(),
          section: navItem.title,
          subtitle: `Go to ${childItem.title}`,
          perform: () => navigateTo(childItem.url)
        })) ?? [];

      return baseAction ? [baseAction, ...childActions] : childActions;
    });
  }, [router, serverNavGroups, filteredGroups]);

  return (
    <KBarProvider actions={actions}>
      <KBarComponent>{children}</KBarComponent>
    </KBarProvider>
  );
}
const KBarComponent = ({ children }: { children: React.ReactNode }) => {
  useThemeSwitching();

  return (
    <>
      <KBarPortal>
        <KBarPositioner className='bg-background/80 fixed inset-0 z-99999 p-0! backdrop-blur-sm'>
          <KBarAnimator className='bg-card text-card-foreground relative mt-64! w-full max-w-[600px] -translate-y-12! overflow-hidden rounded-lg border shadow-lg'>
            <div className='bg-card border-border sticky top-0 z-10 border-b'>
              <KBarSearch className='bg-card w-full border-none px-6 py-4 text-lg outline-hidden focus:ring-0 focus:ring-offset-0 focus:outline-hidden' />
            </div>
            <div className='max-h-[400px]'>
              <RenderResults />
            </div>
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </>
  );
};
