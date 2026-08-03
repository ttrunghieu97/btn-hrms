'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import {
  issuesQueryOptions,
  assetUnitsQueryOptions,
  assetHistoryQueryOptions,
} from '../api/queries';
import { formatDateVN } from '@/lib/date';
import { useIssueAsset, useReturnAsset } from '../api/mutations';
import type {
  AssetIssueListFilters,
  AssetUnitListFilters,
} from '../queries/asset-queries';
import { extractList, extractPagination, unwrapData } from '@/lib/api-extract';
import {
  ISSUE_LINE_STATUS_MAP,
  HISTORY_KIND_MAP,
  type AssetIssueRow,
  type AssetIssueLineRow,
  type AssetUnitRow,
  type AssetHistoryEntryRow,
} from './status-maps';
import {
  notifyMutationError,
  notifyMutationSuccess,
} from '@/lib/mutation-feedback';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { commonUiCopy, assetManagementUiCopy } from '@/locales/vi/app-copy';
import { pageParser } from '@/lib/pagination';
import { employeesQueryOptions } from '@/features/employees';
import type { EmployeeResponseDto } from '@/api/generated/model';

const copy = assetManagementUiCopy.issues;

export function AssetIssuesView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    status: parseAsString,
  });

  const filters: AssetIssueListFilters = {
    page: params.page,
    limit: 20,
    ...(params.status ? { status: params.status as any } : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(
    issuesQueryOptions(filters),
  );
  const rows = extractList<AssetIssueRow>(data);
  const pagination = extractPagination(data);

  const unitFilters: AssetUnitListFilters = {
    limit: 500,
    ...(params.status ? { status: params.status as any } : {}),
  };
  const { data: unitData } = useQuery(assetUnitsQueryOptions(unitFilters));
  const units = extractList<AssetUnitRow>(unitData);

  const [issueOpen, setIssueOpen] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);
  const [employeeId, setEmployeeId] = React.useState('');
  const [issueUnitId, setIssueUnitId] = React.useState('');
  const [issueQuantity, setIssueQuantity] = React.useState('');
  const [returnUnitId, setReturnUnitId] = React.useState('');
  const [returnQuantity, setReturnQuantity] = React.useState('');
  const [condition, setCondition] = React.useState('');

  const employeesQuery = useQuery(employeesQueryOptions({ limit: 500 }));
  const employees = React.useMemo(
    () => extractList<EmployeeResponseDto>(employeesQuery.data),
    [employeesQuery.data],
  );

  const issueMutation = useIssueAsset();
  const returnMutation = useReturnAsset();

  const [historyAssetId, setHistoryAssetId] = React.useState<string | null>(null);
  const { data: historyData, isFetching: historyLoading } = useQuery(
    assetHistoryQueryOptions(historyAssetId ?? ''),
  );
  const historyEntries = React.useMemo(() => {
    const result = unwrapData<{ entries: AssetHistoryEntryRow[] }>(historyData);
    return result?.entries ?? [];
  }, [historyData]);

  // find the currently-selected unit's assetTypeId + tracked flag for the dto
  const selectedUnit = units.find((u) => u.id === issueUnitId);

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !issueUnitId) return;
    issueMutation.mutate(
      {
        employeeId,
        lines: [
          {
            // omit assetId for quantity-only stock lines; tracked units carry serial per unit
            assetId: selectedUnit?.status === 'available' ? selectedUnit.id : undefined,
            assetTypeId: selectedUnit?.assetTypeId ?? '',
            quantity: Number(issueQuantity) || 1,
          },
        ],
      },
      {
        onSuccess: () => {
          notifyMutationSuccess(copy.toastSuccess);
          setIssueOpen(false);
          setEmployeeId('');
          setIssueUnitId('');
          setIssueQuantity('');
        },
        onError: (err) => notifyMutationError(err, copy.toastSuccess),
      },
    );
  };

  const handleReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnUnitId) return;
    returnMutation.mutate(
      {
        issueLineId: returnUnitId,
        ...(returnQuantity
          ? { quantity: Number(returnQuantity) }
          : {}),
        ...(condition ? { condition } : {}),
      },
      {
        onSuccess: () => {
          notifyMutationSuccess(copy.toastSuccessReturn);
          setReturnOpen(false);
          setReturnUnitId('');
          setReturnQuantity('');
          setCondition('');
        },
        onError: (err) => notifyMutationError(err, copy.toastSuccessReturn),
      },
    );
  };

  // a line eligible for return: open status
  const openLineFromRow = (line: AssetIssueLineRow) => line.status === 'open';

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject={copy.title}
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{copy.title}</h2>
        <div className='flex gap-2'>
          <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
            <DialogTrigger asChild>
              <Button variant='outline' size='sm'>{copy.return}</Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[450px]'>
              <form onSubmit={handleReturn} className='space-y-4'>
                <DialogHeader>
                  <DialogTitle>{copy.returnTitle}</DialogTitle>
                  <DialogDescription>{copy.returnDescription}</DialogDescription>
                </DialogHeader>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='returnLine'>{copy.fields.assetUnit}</Label>
                  <Select value={returnUnitId} onValueChange={setReturnUnitId}>
                    <SelectTrigger id='returnLine'>
                      <SelectValue placeholder={copy.columns.assetUnit} />
                    </SelectTrigger>
                    <SelectContent>
                      {rows.flatMap((r) =>
                        (r.lines ?? [])
                          .filter(openLineFromRow)
                          .map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.assetId ?? l.assetTypeId ?? l.id} ({r.employeeId})
                            </SelectItem>
                          )),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='returnQty'>{copy.fields.quantity}</Label>
                  <Input
                    id='returnQty'
                    type='number'
                    min={1}
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(e.target.value)}
                    placeholder={copy.fields.quantity}
                  />
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='condition'>{copy.fields.condition}</Label>
                  <Input
                    id='condition'
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder={copy.fields.condition}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setReturnOpen(false)}
                    disabled={returnMutation.isPending}
                  >
                    {commonUiCopy.cancel}
                  </Button>
                  <Button type='submit' disabled={returnMutation.isPending}>
                    {returnMutation.isPending && (
                      <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                    )}
                    {copy.return}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
            <DialogTrigger asChild>
              <Button size='sm'>{copy.issue}</Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[450px]'>
              <form onSubmit={handleIssue} className='space-y-4'>
                <DialogHeader>
                  <DialogTitle>{copy.dialogTitle}</DialogTitle>
                  <DialogDescription>{copy.dialogDescription}</DialogDescription>
                </DialogHeader>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='issueEmployee'>{copy.columns.employee}</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger id='issueEmployee'>
                      <SelectValue placeholder={copy.columns.employee} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp: EmployeeResponseDto) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeCode || emp.id.slice(0, 8)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='issueUnit'>{copy.columns.assetUnit}</Label>
                  <Select value={issueUnitId} onValueChange={setIssueUnitId}>
                    <SelectTrigger id='issueUnit'>
                      <SelectValue placeholder={copy.columns.assetUnit} />
                    </SelectTrigger>
                    <SelectContent>
                      {units
                        .filter((u) => u.status === 'available' || !u.status)
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.serialNumber || u.id} ({u.assetTypeId})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='issueQty'>{copy.fields.quantity}</Label>
                  <Input
                    id='issueQty'
                    type='number'
                    min={1}
                    value={issueQuantity}
                    onChange={(e) => setIssueQuantity(e.target.value)}
                    placeholder={copy.fields.quantity}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setIssueOpen(false)}
                    disabled={issueMutation.isPending}
                  >
                    {commonUiCopy.cancel}
                  </Button>
                  <Button type='submit' disabled={issueMutation.isPending}>
                    {issueMutation.isPending && (
                      <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                    )}
                    {copy.issue}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {rows.length === 0 && !isLoading ? (
        <AppEmptyState
          icon={<Icons.page className='size-10' />}
          title={copy.empty}
          compact
        />
      ) : (
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.columns.employee}</TableHead>
                <TableHead>{copy.columns.assetUnit}</TableHead>
                <TableHead>{copy.columns.status}</TableHead>
                <TableHead>{copy.columns.issuedAt}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id ?? Math.random().toString()}>
                  <TableCell className='font-medium'>{row.employeeId ?? '—'}</TableCell>
                  <TableCell>
                    {(row.lines ?? []).length > 0
                      ? (row.lines ?? []).map((l) => l.assetId ?? l.assetTypeId ?? l.id).join(', ')
                      : '—'}
                    <div className='mt-1 flex flex-wrap items-center gap-1.5'>
                      {(row.lines ?? []).map((l) => (
                        <div key={l.id} className='flex items-center gap-1.5'>
                          <StatusBadge status={l.status ?? ''} mapping={ISSUE_LINE_STATUS_MAP} />
                          {l.assetId && (
                            <button
                              type='button'
                              className='text-xs text-primary underline-offset-2 hover:underline'
                              onClick={() => setHistoryAssetId(l.assetId!)}
                            >
                              {copy.historyTitle}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={(row.lines ?? []).every((l) => l.status === 'returned') ? 'returned' : 'open'}
                      mapping={ISSUE_LINE_STATUS_MAP}
                    />
                  </TableCell>
                  <TableCell>{row.issuedAt ? formatDateVN(row.issuedAt) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && pagination.total > filters.limit! ? (
        <div className='flex items-center justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={params.page <= 1}
            onClick={() => void setParams({ page: params.page - 1 })}
          >
            ‹
          </Button>
          <span className='text-sm text-muted-foreground'>{params.page}</span>
          <Button
            variant='outline'
            size='sm'
            disabled={params.page * filters.limit! >= pagination.total}
            onClick={() => void setParams({ page: params.page + 1 })}
          >
            ›
          </Button>
        </div>
      ) : null}

      <Dialog open={!!historyAssetId} onOpenChange={(open) => !open && setHistoryAssetId(null)}>
        <DialogContent className='sm:max-w-[520px]'>
          <DialogHeader>
            <DialogTitle>{copy.historyTitle}</DialogTitle>
            <DialogDescription>
              {historyAssetId ? `${historyAssetId}` : '—'}
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className='flex justify-center py-8'>
              <Icons.spinner className='h-5 w-5 animate-spin' />
            </div>
          ) : historyEntries.length === 0 ? (
            <p className='py-6 text-center text-sm text-muted-foreground'>{copy.historyEmpty}</p>
          ) : (
            <div className='max-h-[50vh] space-y-3 overflow-y-auto'>
              {historyEntries.map((h) => (
                <div
                  key={h.id ?? `${h.kind}-${h.occurredAt}`}
                  className='flex items-start gap-3 rounded-md border p-3'
                >
                  <div className='mt-0.5 shrink-0'>
                    <StatusBadge status={h.kind ?? ''} mapping={HISTORY_KIND_MAP} />
                  </div>
                  <div className='min-w-0 flex-1 text-sm'>
                    <p className='break-words text-muted-foreground'>{h.detail ?? '—'}</p>
                    <p className='mt-0.5 text-xs text-muted-foreground'>
                      {h.occurredAt ? formatDateVN(h.occurredAt) : '—'}
                      {h.actorUserId ? ` · ${h.actorUserId.slice(0, 8)}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}