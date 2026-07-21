'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { parseAsString, useQueryStates } from 'nuqs';
import { DepartmentFormSheet } from './department-form-sheet';
import { PositionFormSheet } from './position-form-sheet';

export function DepartmentsSheetsController() {
  const pathname = usePathname();
  const isPositions = pathname === '/organization/positions';

  const [params, setParams] = useQueryStates({
    create: parseAsString,
    detail: parseAsString
  });

  const handleClose = React.useCallback((open: boolean) => {
    if (!open) {
      setParams({ create: null, detail: null }, { shallow: true }).catch(() => undefined);
    }
  }, [setParams]);

  return (
    <>
      {isPositions ? (
        <PositionFormSheet
          key={params.detail ?? 'new-pos'}
          positionId={params.detail ?? undefined}
          open={!!params.create || !!params.detail}
          onOpenChange={handleClose}
        />
      ) : (
        <DepartmentFormSheet
          key={params.detail ?? 'new-dept'}
          departmentId={params.detail ?? undefined}
          open={!!params.create || !!params.detail}
          onOpenChange={handleClose}
        />
      )}
    </>
  );
}
