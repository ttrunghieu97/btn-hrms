'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequirements, useReplaceRequirements, type RequirementInput } from '../api/requirements-queries';
import { shiftsTemplatesQueryOptions } from '../api/queries';
import { positionsControllerFindAll } from '@/api/generated/endpoints';
import { extractList } from '@/lib/api-extract';
import { commonUiCopy, shiftUiCopy } from '@/lib/app-copy';
import { useQuery as useQueryStd } from '@tanstack/react-query';

interface Props {
  date: string;
}

export function RequirementsEditor({ date }: Props) {
  const { data: reqData, isLoading } = useRequirements(date);
  const templatesQuery = useQuery(shiftsTemplatesQueryOptions({ page: 1, limit: 100 }));
  const positionsQuery = useQueryStd({
    queryKey: ['positions-all'],
    queryFn: () => positionsControllerFindAll().then(r => extractList<{ id: string; name: string }>(r)),
  });
  const replaceMut = useReplaceRequirements();

  const [items, setItems] = useState<RequirementInput[]>([]);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <Skeleton className='h-32 w-full' />;

  const requirements = reqData?.rows ?? [];
  const templates = templatesQuery.data?.templates ?? [];
  const positions = positionsQuery.data ?? [];

  function handleEdit() {
    setItems(requirements.map(r => ({
      shiftTemplateId: r.shiftTemplateId,
      workRoleId: r.workRoleId,
      locationId: r.locationId,
      requiredCount: r.requiredCount,
    })));
    setEditing(true);
  }

  function handleSave() {
    replaceMut.mutate({ date, requirements: items });
    setEditing(false);
  }

  function addRow() {
    setItems([...items, { requiredCount: 1 }]);
  }

  function removeRow(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: keyof RequirementInput, value: any) {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle className='text-sm font-medium'>
          {shiftUiCopy.requirements.title(date)}
        </CardTitle>
        {!editing ? (
          <Button size='sm' variant='outline' onClick={handleEdit}>
            <Icons.edit className='mr-1 h-4 w-4' /> {commonUiCopy.edit}
          </Button>
        ) : (
          <div className='flex gap-2'>
            <Button size='sm' variant='outline' onClick={() => setEditing(false)}>{commonUiCopy.cancel}</Button>
            <Button size='sm' onClick={handleSave} disabled={replaceMut.isPending}>
              {replaceMut.isPending ? commonUiCopy.saving : commonUiCopy.save}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!editing && requirements.length === 0 && (
          <p className='text-sm text-muted-foreground'>{shiftUiCopy.requirements.empty}</p>
        )}
        {!editing && requirements.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{shiftUiCopy.requirements.shiftLabel}</TableHead>
                <TableHead>{shiftUiCopy.requirements.positionLabel}</TableHead>
                <TableHead className='text-right'>{shiftUiCopy.requirements.requiredCountLabel}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.shiftTemplateName ?? r.shiftTemplateId?.slice(0, 8) ?? shiftUiCopy.requirements.anyOption}</TableCell>
                  <TableCell>{r.workRoleName ?? r.workRoleId?.slice(0, 8) ?? shiftUiCopy.requirements.anyOption}</TableCell>
                  <TableCell className='text-right font-medium'>{r.requiredCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {editing && (
          <div className='space-y-2'>
            {items.map((item, i) => (
              <div key={i} className='flex items-end gap-2'>
                <div className='flex-1'>
                  <Label className='text-xs'>{shiftUiCopy.requirements.shiftLabel}</Label>
                  <select
                    className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'
                    value={item.shiftTemplateId ?? ''}
                    onChange={e => updateRow(i, 'shiftTemplateId', e.target.value || null)}
                  >
                    <option value=''>{shiftUiCopy.requirements.anyOption}</option>
                    {templates.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className='flex-1'>
                  <Label className='text-xs'>{shiftUiCopy.requirements.positionLabel}</Label>
                  <select
                    className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'
                    value={item.workRoleId ?? ''}
                    onChange={e => updateRow(i, 'workRoleId', e.target.value || null)}
                  >
                    <option value=''>{shiftUiCopy.requirements.anyOption}</option>
                    {positions.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className='w-20'>
                  <Label className='text-xs'>{shiftUiCopy.requirements.countLabel}</Label>
                  <Input
                    type='number'
                    min={1}
                    value={item.requiredCount}
                    onChange={e => updateRow(i, 'requiredCount', parseInt(e.target.value) || 1)}
                  />
                </div>
                <Button variant='ghost' size='icon' onClick={() => removeRow(i)}>
                  <Icons.close className='h-4 w-4' />
                </Button>
              </div>
            ))}
            <Button variant='outline' size='sm' onClick={addRow}>
              <Icons.add className='mr-1 h-4 w-4' /> {shiftUiCopy.requirements.addBtn}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
