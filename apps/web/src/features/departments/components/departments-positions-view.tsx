'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { parseAsString, useQueryStates } from 'nuqs';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { DepartmentsTable } from './departments-table';
import { PositionsTable } from './positions-table';
import { PageHeader } from '@/components/layout/page-header';
import { departmentUiCopy } from '@/lib/app-copy';
import type { DepartmentRow } from '../queries/department-queries';
import type { PositionListItemDto } from '@/api/generated/model';

export function DepartmentsPositionsView() {
  const pathname = usePathname();
  const isPositions = pathname === '/organization/positions';

  const [, setParams] = useQueryStates({
    create: parseAsString,
    detail: parseAsString
  });

  function handleDeptRowClick(row: DepartmentRow) {
    setParams({ detail: row.id, create: null }, { shallow: true }).catch(() => undefined);
  }

  function handlePosRowClick(row: PositionListItemDto) {
    setParams({ detail: row.id, create: null }, { shallow: true }).catch(() => undefined);
  }

  function handleCreateClick() {
    setParams({ create: 'true', detail: null }, { shallow: true }).catch(() => undefined);
  }

  const createLabel = !isPositions
    ? departmentUiCopy.tabs.addDepartment
    : departmentUiCopy.tabs.addPosition;

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <PageHeader
        title={!isPositions ? 'Quản lý phòng ban' : 'Quản lý vị trí'}
        description={!isPositions ? 'Quản lý cơ cấu phòng ban và phân bổ nhân sự' : 'Quản lý các chức danh và vị trí công việc'}
        actions={
          <Button onClick={handleCreateClick} size='sm'>
            <Icons.add className='mr-1.5 h-4 w-4' />
            {createLabel}
          </Button>
        }
      />

      <div className='flex flex-1 flex-col'>
        {!isPositions ? (
          <DepartmentsTable onRowClick={handleDeptRowClick} />
        ) : (
          <PositionsTable onRowClick={handlePosRowClick} />
        )}
      </div>
    </div>
  );
}
