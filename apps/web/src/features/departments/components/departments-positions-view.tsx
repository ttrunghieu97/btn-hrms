'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { parseAsString, useQueryStates } from 'nuqs';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { DepartmentsTable } from './departments-table';
import { PositionsTable } from './positions-table';
import { LocationsTable } from './locations-table';
import { departmentUiCopy } from '@/lib/app-copy';
import type { DepartmentRow, LocationListItemDto } from '../queries/department-queries';
import type { PositionListItemDto } from '@/api/generated/model';

export function DepartmentsPositionsView() {
  const pathname = usePathname();
  const isPositions = pathname === '/organization/positions';
  const isLocations = pathname === '/organization/locations';

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

  function handleLocRowClick(row: LocationListItemDto) {
    setParams({ detail: row.id, create: null }, { shallow: true }).catch(() => undefined);
  }

  function handleCreateClick() {
    setParams({ create: 'true', detail: null }, { shallow: true }).catch(() => undefined);
  }

  const createLabel = isLocations
    ? 'Thêm địa điểm'
    : isPositions
      ? departmentUiCopy.tabs.addPosition
      : departmentUiCopy.tabs.addDepartment;

  return (
    <div className='flex flex-1 flex-col gap-4 min-h-0'>
      <div className='flex items-center justify-end gap-4'>
        <Button onClick={handleCreateClick} size='sm'>
          <Icons.add className='mr-1.5 h-4 w-4' />
          {createLabel}
        </Button>
      </div>

      <div className='flex flex-1 flex-col min-h-0 overflow-hidden'>
        {isLocations ? (
          <LocationsTable onRowClick={handleLocRowClick} />
        ) : isPositions ? (
          <PositionsTable onRowClick={handlePosRowClick} />
        ) : (
          <DepartmentsTable onRowClick={handleDeptRowClick} />
        )}
      </div>
    </div>
  );
}
