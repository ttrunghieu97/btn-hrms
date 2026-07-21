'use client';

import * as React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EmployeeResponseDto } from '@/api/generated/model';
import { cn } from '@/lib/utils';
import { employeeUiCopy } from '@/lib/app-copy';
import { EmployeeSummaryHeader } from './employee-summary-header';

interface EmployeeTabBarProps {
  employee: EmployeeResponseDto;
  activeTab: string;
  onTabChange: (tab: string) => void;
  avatarUrl: string | undefined;
  isEditing: boolean;
  showAvatarUploadButton: boolean;
  canRemoveAvatar: boolean;
  isPending: boolean;
  isUploading: boolean;
  onAvatarUploadClick: (trigger: HTMLElement) => void;
  onAvatarRemoveClick: () => void;
  editButton?: React.ReactNode;
  actionsDropdown?: React.ReactNode;
  tabErrorCounts?: Record<string, number>;
  tabs?: Array<{ value: string; label: string }>;
}

const DEFAULT_TABS = [
  { value: 'overview', label: employeeUiCopy.tabs.detailOverview },
  { value: 'documents', label: employeeUiCopy.tabs.detailDocuments },
  { value: 'employment', label: employeeUiCopy.tabs.detailEmployment },
  { value: 'assets', label: employeeUiCopy.tabs.detailAssets },
  { value: 'timeline', label: employeeUiCopy.tabs.detailTimeline },
];

export function EmployeeTabBar({
  employee,
  activeTab,
  onTabChange,
  avatarUrl,
  isEditing,
  showAvatarUploadButton,
  canRemoveAvatar,
  isPending,
  isUploading,
  onAvatarUploadClick,
  onAvatarRemoveClick,
  editButton,
  actionsDropdown,
  tabErrorCounts,
  tabs = DEFAULT_TABS,
}: EmployeeTabBarProps) {
  return (
    <div className='shrink-0 border-b border-border/60 bg-background/95 px-6 py-4 pr-14 backdrop-blur'>
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0 flex-1'>
          <EmployeeSummaryHeader
            employee={employee}
            avatarUrl={avatarUrl}
            isEditing={isEditing}
            showAvatarUploadButton={showAvatarUploadButton}
            canRemoveAvatar={canRemoveAvatar}
            isPending={isPending}
            isUploading={isUploading}
            onAvatarUploadClick={onAvatarUploadClick}
            onAvatarRemoveClick={onAvatarRemoveClick}
          />
        </div>
        {(editButton || actionsDropdown) && (
          <div className='flex shrink-0 items-center gap-2'>
            {editButton}
            {actionsDropdown}
          </div>
        )}
      </div>
      <Tabs value={activeTab} onValueChange={onTabChange} className='mt-4'>
        <TabsList className='h-auto'>
          {tabs.map((tab) => {
            const errorCount = tabErrorCounts?.[tab.value] ?? 0;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className='relative'>
                {tab.label}
                {errorCount > 0 && (
                  <span className='bg-destructive text-destructive-foreground ml-1.5 inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold leading-none'>
                    {errorCount}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
