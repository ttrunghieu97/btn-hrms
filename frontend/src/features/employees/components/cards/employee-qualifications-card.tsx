'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useQualifications, useReplaceQualifications } from '../../api/qualification-queries';
import { useQuery } from '@tanstack/react-query';
import { positionsControllerFindAll } from '@/api/generated/endpoints';
import { extractList } from '@/lib/api-extract';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';

interface Props {
  employeeId: string;
}

export function EmployeeQualificationsCard({ employeeId }: Props) {
  const { data: qualifications, isLoading } = useQualifications(employeeId);
  const positionsQuery = useQuery({
    queryKey: ['positions-all'],
    queryFn: () => positionsControllerFindAll().then(r => extractList<{ id: string; name: string; isActive: boolean }>(r)),
  });
  const replaceMut = useReplaceQualifications();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  if (isLoading) return <Skeleton className='h-24 w-full' />;

  const quals = qualifications ?? [];
  const positions = positionsQuery.data ?? [];

  function handleEdit() {
    setSelected(quals.map(q => q.positionId));
    setEditing(true);
  }

  function togglePosition(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  function handleSave() {
    replaceMut.mutate({ employeeId, positionIds: selected }, {
      onSuccess: () => setEditing(false),
    });
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle className='text-sm font-medium'>{employeeUiCopy.qualificationsTitle}</CardTitle>
        {!editing && quals.length > 0 && (
          <Button size='sm' variant='outline' onClick={handleEdit}>
            <Icons.edit className='h-3 w-3' />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!editing && quals.length === 0 && (
          <div className='flex items-center justify-between'>
            <p className='text-sm text-muted-foreground'>{employeeUiCopy.noQualifications}</p>
            <Button size='sm' variant='outline' onClick={handleEdit}>
              <Icons.add className='mr-1 h-3 w-3' /> {commonUiCopy.add}
            </Button>
          </div>
        )}
        {!editing && quals.length > 0 && (
          <div className='flex flex-wrap gap-1.5'>
            {quals.map(q => (
              <Badge key={q.positionId} variant='secondary'>{q.positionName}</Badge>
            ))}
          </div>
        )}
        {editing && (
          <div className='space-y-2'>
            <div className='flex flex-wrap gap-1.5'>
              {positions.filter(p => p.isActive).map(p => (
                <Badge
                  key={p.id}
                  variant={selected.includes(p.id) ? 'default' : 'outline'}
                  className='cursor-pointer'
                  onClick={() => togglePosition(p.id)}
                >
                  {p.name}
                </Badge>
              ))}
            </div>
            <div className='flex gap-2 pt-2'>
              <Button size='sm' variant='outline' onClick={() => setEditing(false)}>{commonUiCopy.cancel}</Button>
              <Button size='sm' onClick={handleSave} disabled={replaceMut.isPending}>
                {replaceMut.isPending ? commonUiCopy.saving : commonUiCopy.save}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
