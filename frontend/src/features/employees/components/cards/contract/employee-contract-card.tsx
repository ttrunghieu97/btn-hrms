'use client';

import * as React from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useContractQuery } from '../../../api/contract-queries';
import { AmendContractDialog } from '../../dialogs/contract/amend-contract-dialog';
import { ContractHistoryDialog } from '../../dialogs/contract/contract-history-dialog';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';

interface EmployeeContractCardProps {
  employeeId: string;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return value;
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
    active: employeeUiCopy.contract.statusLabels.active,
    terminated: employeeUiCopy.contract.statusLabels.terminated,
    superseded: employeeUiCopy.contract.statusLabels.superseded,
  };
  return labels[status] ?? status;
}

function contractStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    case 'terminated':
    case 'superseded': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function EmployeeContractCard({ employeeId }: EmployeeContractCardProps) {
  const [amendOpen, setAmendOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  const contractQuery = useContractQuery(employeeId);

  const contract = contractQuery.data;

  return (
    <>
      <div className='rounded-lg border border-border/60 bg-card'>
        {/* Header */}
        <div className='border-b border-border/40 bg-muted/20 px-4 py-3'>
          <h3 className='text-sm font-semibold text-foreground/80'>
            {employeeUiCopy.employmentContract}
          </h3>
        </div>

        {contractQuery.isLoading ? (
          <div className='flex items-center justify-center px-4 py-6'>
            <Icons.spinner className='size-4 animate-spin text-muted-foreground' />
          </div>
        ) : contract ? (
          <>
            <div className='px-4 py-3'>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-semibold'>
                  {contractTypeLabel(contract.contractType)}
                </span>
                <span className='text-muted-foreground text-xs'>·</span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${contractStatusColor(contract.contractStatus)}`}>
                  {contractStatusLabel(contract.contractStatus)}
                </span>
              </div>
              <p className='text-muted-foreground mt-1.5 text-xs'>
                {formatDate(contract.startDate)}
                {contract.endDate
                  ? ` → ${formatDate(contract.endDate)}`
                  : ` → ${employeeUiCopy.contract.indefiniteTerm}`}
              </p>
            </div>

            <div className='border-t border-border/40 px-4 py-3'>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='default'
                  size='sm'
                  className='flex-1'
                  onClick={() => setAmendOpen(true)}
                >
                  <Icons.edit className='mr-1.5 size-3.5' />
                  {commonUiCopy.edit}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='flex-1'
                  onClick={() => setHistoryOpen(true)}
                >
                  <Icons.clock className='mr-1.5 size-3.5' />
                  {employeeUiCopy.contract.historyTitle}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className='px-4 py-6 text-center text-xs text-muted-foreground'>
            {employeeUiCopy.contract.noContractData}
          </div>
        )}
      </div>

      <AmendContractDialog
        employeeId={employeeId}
        contract={contract}
        open={amendOpen}
        onOpenChange={setAmendOpen}
      />

      <ContractHistoryDialog
        employeeId={employeeId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </>
  );
}
