'use client';

import { Skeleton } from 'boneyard-js/react';

export default function TasksLoading() {
  return <Skeleton name="page-loading" loading>{null}</Skeleton>;
}
