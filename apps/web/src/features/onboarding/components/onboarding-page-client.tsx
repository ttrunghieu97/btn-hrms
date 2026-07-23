'use client';

import { useQueryStates, parseAsString } from 'nuqs';
import { OnboardingProcessesView } from './processes-view';
import { OnboardingProcessDetailView } from './process-detail-view';
import { OnboardingTemplatesView } from './templates-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCallback } from 'react';

export function OnboardingPageClient() {
  const [params, setParams] = useQueryStates({
    id: parseAsString,
    tab: parseAsString.withDefault('processes'),
  });

  const handleTabChange = useCallback((value: string) => {
    setParams({ tab: value, id: null });
  }, [setParams]);

  if (params.id) {
    return (
      <div className='flex min-h-0 flex-1 flex-col'>
        <OnboardingProcessDetailView processId={params.id} />
      </div>
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <Tabs value={params.tab} onValueChange={handleTabChange} className='flex flex-1 flex-col'>
        <TabsList>
          <TabsTrigger value='processes'>Quy trình</TabsTrigger>
          <TabsTrigger value='templates'>Mẫu Template</TabsTrigger>
        </TabsList>
        <TabsContent value='processes' className='flex flex-1 flex-col min-h-0'>
          <OnboardingProcessesView />
        </TabsContent>
        <TabsContent value='templates' className='flex flex-1 flex-col min-h-0'>
          <OnboardingTemplatesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
