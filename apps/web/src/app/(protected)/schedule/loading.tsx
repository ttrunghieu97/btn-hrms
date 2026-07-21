'use client';

import { Skeleton } from 'boneyard-js/react';

export default function ScheduleLoading() {
  return <Skeleton name="table-loading" loading>{null}</Skeleton>;
}
