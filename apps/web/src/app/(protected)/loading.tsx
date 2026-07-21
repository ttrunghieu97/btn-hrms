'use client';

import { Skeleton } from 'boneyard-js/react';

export default function DashboardLoading() {
  return <Skeleton name="page-loading" loading>{null}</Skeleton>;
}
