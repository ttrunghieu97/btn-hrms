'use client';

import { Skeleton } from 'boneyard-js/react';

export default function EmployeesLoading() {
  return <Skeleton name="table-loading" loading>{null}</Skeleton>;
}
