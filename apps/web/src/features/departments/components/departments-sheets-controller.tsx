'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { parseAsString, useQueryStates } from 'nuqs';
import dynamic from 'next/dynamic';

const DepartmentFormSheet = dynamic(
  () => import('./department-form-sheet').then((mod) => mod.DepartmentFormSheet),
  { ssr: false }
);
const PositionFormSheet = dynamic(
  () => import('./position-form-sheet').then((mod) => mod.PositionFormSheet),
  { ssr: false }
);

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
