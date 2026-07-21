'use client';

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import * as React from 'react';

export function SidebarBrand() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='h-auto w-full cursor-pointer select-none p-0 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
          onClick={toggleSidebar}
        >
          <div
            className={cn(
              'flex w-full items-center gap-3 overflow-hidden py-2.5 transition-all duration-200',
              isCollapsed ? 'justify-center px-1' : 'px-3'
            )}
          >
            <div className='bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-lg'>
              <Image
                src='/logo-vang.png'
                alt='BTN'
                width={24}
                height={24}
                className='size-5 object-contain'
                priority
              />
            </div>
            {!isCollapsed && (
              <div className='flex min-w-0 flex-col'>
                <span className='text-sidebar-foreground truncate text-sm font-semibold tracking-tight'>
                  BTN HRMS
                </span>
                <span className='text-sidebar-foreground/50 truncate text-[10px] font-normal tracking-wide uppercase'>
                  Bach Thao Ngan
                </span>
              </div>
            )}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
