'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useContractHistoryQuery, type ContractHistoryItem } from '../../../api/contract-queries';
import { AmendContractDialog } from './amend-contract-dialog';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';

interface ContractHistoryDialogProps {
  employeeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function contractTypeLabel(type: string | null): string {
  const labels: Record<string, string> = {
    permanent: employeeUiCopy.contract.types.permanent,
    fixed_term: employeeUiCopy.contract.types.fixed_term,
    probationary: employeeUiCopy.contract.types.probationary,
    internship: employeeUiCopy.contract.types.internship,
    service: employeeUiCopy.contract.types.service,
    part_time: employeeUiCopy.contract.types.part_time,
  };
  return type ? labels[type] ?? type : '—';
}

function contractStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: employeeUiCopy.contract.statusLabels.draft,
    active: employeeUiCopy.contract.statusLabels.active,
    terminated: employeeUiCopy.contract.statusLabels.terminated,
    superseded: employeeUiCopy.contract.statusLabels.superseded,
  };
  return labels[status] ?? status;
}

function contractStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    case 'draft': return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
    case 'terminated': return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300';
    case 'superseded': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function ContractHistoryDialog({
  employeeId,
  open,
  onOpenChange,
}: ContractHistoryDialogProps) {
  const [amendOpen, setAmendOpen] = React.useState(false);
  const historyQuery = useContractHistoryQuery(open ? employeeId : '');
  const history = historyQuery.data ?? [];

  const currentContract = history.find((entry) => entry.isCurrent) ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{employeeUiCopy.contract.historyTitle}</DialogTitle>
            <DialogDescription>
              {employeeUiCopy.contract.historyDescription}
            </DialogDescription>
          </DialogHeader>

          <div className='max-h-[60vh] overflow-y-auto pr-1'>
            {historyQuery.isLoading ? (
              <div className='flex items-center justify-center py-8'>
                <Icons.spinner className='size-5 animate-spin text-muted-foreground' />
              </div>
            ) : history.length === 0 ? (
              <p className='py-8 text-center text-xs text-muted-foreground'>
                {employeeUiCopy.contract.noHistory}
              </p>
            ) : (
              <div className='space-y-2'>
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-lg border px-4 py-3 ${
                      entry.isCurrent
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border/40'
                    }`}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='text-sm font-semibold'>
                            V{entry.version}
                          </span>
                          <span className='text-muted-foreground text-xs'>
                            ·
                          </span>
                          <span className='text-sm font-medium'>
                            {contractTypeLabel(entry.contractType)}
                          </span>
                          {entry.isCurrent && (
                            <Badge variant='outline' className='border-primary/40 text-primary text-[10px]'>
                              {employeeUiCopy.currentDateRangeFallback}
                            </Badge>
                          )}
                        </div>
                        <p className='text-muted-foreground mt-1 text-xs'>
                          {entry.effectiveFrom}
                          {entry.effectiveTo
                            ? ` → ${entry.effectiveTo}`
                            : ` → ${employeeUiCopy.contract.indefiniteTerm}`}
                        </p>
                        {entry.contractNumber && (
                          <p className='text-muted-foreground mt-0.5 text-[11px]'>
                            {employeeUiCopy.contract.numberLabel}: {entry.contractNumber}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${contractStatusColor(entry.contractStatus)}`}>
                        {contractStatusLabel(entry.contractStatus)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='flex justify-end gap-2'>
            {currentContract && (
              <Button
                type='button'
                size='sm'
                onClick={() => {
                  onOpenChange(false);
                  setAmendOpen(true);
                }}
              >
                <Icons.edit className='mr-1.5 size-4' />
                {employeeUiCopy.contract.editTitle}
              </Button>
            )}
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
            >
              {commonUiCopy.close}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AmendContractDialog
        employeeId={employeeId}
        contract={currentContract ? { employeeId, startDate: currentContract.effectiveFrom, endDate: currentContract.effectiveTo ?? null, contractType: currentContract.contractType, contractStatus: currentContract.contractStatus } : null}
        open={amendOpen}
        onOpenChange={setAmendOpen}
      />
    </>
  );
}
