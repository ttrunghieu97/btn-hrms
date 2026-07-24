'use client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { useNotificationsQuery } from '@/features/notifications/queries/notification-queries';
import { useNav } from '@/features/nav';
import { extractProtectedAssetUrl } from '@/lib/asset-url';
import { appCopy } from '@/lib/app-copy';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { Icons } from '../icons';
import { SidebarBrand } from '../sidebar-brand';
import { SidebarThemeToggle } from '../sidebar-theme-toggle';

import type { NavResponse } from '@/features/nav/types/nav-types';

export default function AppSidebar({ initialNavData }: { initialNavData?: NavResponse }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: navGroups = [], isLoading, status } = useNav(initialNavData);
  const signOut = useAuthStore((state) => state.signOut);
  const authUser = useAuthStore((state) => state.user);
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { data: notifications = [] } = useNotificationsQuery();
  const isCollapsed = state === 'collapsed';
  const currentUser = authUser
    ? {
        imageUrl: extractProtectedAssetUrl(authUser.avatar),
        fullName: authUser.username,
        emailAddresses: authUser.email
          ? [{ emailAddress: authUser.email }]
          : []
      }
    : null;

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      window.location.href = '/auth/sign-in';
    }
  };

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent className='overflow-x-hidden'>
        {isLoading || (!navGroups.length && status === 'pending') ? (
          <div className='flex flex-col items-center justify-center gap-3 px-4 py-12 text-center'>
            <Icons.spinner className='text-muted-foreground size-6 animate-spin' />
          </div>
        ) : navGroups.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-3 px-4 py-12 text-center'>
            <Icons.shield className='text-muted-foreground size-10' />
            <div className='space-y-1'>
              <p className='text-sm font-medium'>{appCopy.nav.emptyModules}</p>
              <p className='text-muted-foreground text-xs'>{appCopy.nav.emptyModulesDescription}</p>
            </div>
          </div>
        ) : (
          navGroups.map((group) => (
            <SidebarGroup key={group.id} className='py-0'>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon && item.icon in Icons
                    ? Icons[item.icon as keyof typeof Icons]
                    : Icons.logo;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const isDisabled = item.state === 'disabled' || item.state === 'coming_soon';

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild={!isDisabled}
                        tooltip={item.label}
                        isActive={isActive}
                        disabled={isDisabled}
                      >
                        {isDisabled ? (
                          <>
                            <Icon />
                            <span>{item.label}</span>
                          </>
                        ) : (
                          <Link
                            href={item.href}
                            aria-current={pathname === item.href ? 'page' : undefined}
                            onClick={() => isMobile && setOpenMobile(false)}
                          >
                            <Icon />
                            <span>{item.label}</span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                      {item.badge && (
                        <SidebarMenuBadge className='text-[10px] text-muted-foreground'>
                          {item.badge.label ?? item.badge.type}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={appCopy.nav.items.notifications}>
              <Link href='/account/notifications' className='relative' onClick={() => isMobile && setOpenMobile(false)}>
                <Icons.notification className='size-4' />
                <span>{appCopy.nav.items.notifications}</span>
                {unreadCount > 0 && (
                  <span className='bg-destructive text-destructive-foreground absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium group-data-[collapsible=icon]:top-auto group-data-[collapsible=icon]:-right-1'>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarThemeToggle />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size='lg'
                  className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                >
                  <UserAvatarProfile className='h-8 w-8 rounded-lg' showInfo={!isCollapsed} user={currentUser} />
                  {!isCollapsed && <Icons.chevronsDown className='ml-auto size-4' />}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                side='bottom'
                align='end'
                sideOffset={4}
              >
                <DropdownMenuLabel className='p-0 font-normal'>
                  <div className='px-1 py-1.5'>
                    <UserAvatarProfile className='h-8 w-8 rounded-lg' showInfo user={currentUser} />
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => { isMobile && setOpenMobile(false); router.push('/account/profile'); }}>
                    <Icons.account className='mr-2 h-4 w-4' />
                    {appCopy.nav.items.profile}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { isMobile && setOpenMobile(false); router.push('/change-password'); }}>
                    <Icons.lock className='mr-2 h-4 w-4' />
                    {appCopy.nav.items.changePassword}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleLogout()}>
                  <Icons.logout className='mr-2 h-4 w-4' />
                  {appCopy.nav.items.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
