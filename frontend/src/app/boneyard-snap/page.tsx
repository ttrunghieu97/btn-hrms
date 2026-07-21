'use client';

import { Skeleton } from 'boneyard-js/react';
import { Skeleton as UISkeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { PageSkeleton } from '@/components/ui/page-skeleton';

function BarGraphFixture() {
  return (
    <Card>
      <CardHeader>
        <div className='flex items-center gap-2'>
          <UISkeleton className='h-6 w-[160px]' />
          <UISkeleton className='h-5 w-[60px] rounded-full' />
        </div>
        <UISkeleton className='h-4 w-[150px]' />
      </CardHeader>
      <CardContent>
        <div className='flex aspect-auto h-[280px] w-full items-end justify-around gap-2 pt-8'>
          {Array.from({ length: 12 }).map((_, i) => (
            <UISkeleton key={i} className='w-full rounded-t-sm' style={{ height: `${(i % 5 + 1) * 18}%` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AreaGraphFixture() {
  return (
    <Card>
      <CardHeader>
        <div className='flex items-center gap-2'>
          <UISkeleton className='h-6 w-[140px]' />
          <UISkeleton className='h-5 w-[60px] rounded-full' />
        </div>
        <UISkeleton className='h-4 w-[250px]' />
      </CardHeader>
      <CardContent>
        <div className='relative aspect-auto h-[280px] w-full'>
          <div className='from-primary/5 to-primary/20 absolute inset-0 rounded-lg bg-linear-to-t' />
          <UISkeleton className='absolute right-0 bottom-0 left-0 h-[1px]' />
          <UISkeleton className='absolute top-0 bottom-0 left-0 w-[1px]' />
        </div>
      </CardContent>
    </Card>
  );
}

function PieGraphFixture() {
  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='items-center pb-0'>
        <div className='flex items-center gap-2'>
          <UISkeleton className='h-6 w-[100px]' />
          <UISkeleton className='h-5 w-[60px] rounded-full' />
        </div>
        <UISkeleton className='h-4 w-[150px]' />
      </CardHeader>
      <CardContent className='flex flex-1 items-center justify-center pb-0'>
        <UISkeleton className='h-[250px] w-[250px] rounded-full' />
      </CardContent>
    </Card>
  );
}

function RecentSalesFixture() {
  return (
    <Card className='h-full'>
      <CardHeader>
        <UISkeleton className='h-6 w-[140px]' />
        <UISkeleton className='h-4 w-[180px]' />
      </CardHeader>
      <CardContent>
        <div className='space-y-8'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='flex items-center'>
              <UISkeleton className='h-9 w-9 rounded-full' />
              <div className='ml-4 space-y-1'>
                <UISkeleton className='h-4 w-[120px]' />
                <UISkeleton className='h-4 w-[160px]' />
              </div>
              <UISkeleton className='ml-auto h-4 w-[80px]' />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BoneyardPage() {
  return (
    <div style={{ padding: 24 }}>
      {/* overview */}
      <Skeleton name="overview-dashboard" loading={true}>
        <div style={{ height: 500 }} />
      </Skeleton>
      <Skeleton name="overview-bar-graph" loading={true}>
        <BarGraphFixture />
      </Skeleton>
      <Skeleton name="overview-area-graph" loading={true}>
        <AreaGraphFixture />
      </Skeleton>
      <Skeleton name="overview-pie-graph" loading={true}>
        <PieGraphFixture />
      </Skeleton>
      <Skeleton name="overview-recent-sales" loading={true}>
        <RecentSalesFixture />
      </Skeleton>

      {/* payroll */}
      <Skeleton name="payroll-dashboard" loading={true}>
        <div style={{ height: 500 }} />
      </Skeleton>
      <Skeleton name="payroll-periods-table" loading={true}>
        <div style={{ height: 400 }} />
      </Skeleton>
      <Skeleton name="payroll-runs-table" loading={true}>
        <div style={{ height: 400 }} />
      </Skeleton>
      <Skeleton name="payslips-table" loading={true}>
        <div style={{ height: 400 }} />
      </Skeleton>
      <Skeleton name="salary-structures-table" loading={true}>
        <div style={{ height: 400 }} />
      </Skeleton>

      {/* shared */}
      <Skeleton name="page-loading" loading={true}>
        <PageSkeleton />
      </Skeleton>
      <Skeleton name="table-loading" loading={true}>
        <DataTableSkeleton columnCount={6} rowCount={8} />
      </Skeleton>
    </div>
  );
}
