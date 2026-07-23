'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Icons } from '@/components/icons';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { useAmendContractMutation, type ContractData } from '../../../api/contract-queries';
import type { UpdateEmployeeContractDto } from '@/api/generated/model';

const CONTRACT_TYPE_OPTIONS = [
  { value: 'permanent', label: employeeUiCopy.contract.types.permanent },
  { value: 'fixed_term', label: employeeUiCopy.contract.types.fixed_term },
  { value: 'probationary', label: employeeUiCopy.contract.types.probationary },
  { value: 'internship', label: employeeUiCopy.contract.types.internship },
  { value: 'service', label: employeeUiCopy.contract.types.service },
  { value: 'part_time', label: employeeUiCopy.contract.types.part_time },
];

interface AmendContractDialogProps {
  employeeId: string;
  contract: ContractData | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AmendContractDialog({
  employeeId,
  contract,
  open,
  onOpenChange,
}: AmendContractDialogProps) {
  const amendMutation = useAmendContractMutation(employeeId);

  const [contractType, setContractType] = React.useState(contract?.contractType ?? '');
  const [startDate, setStartDate] = React.useState(contract?.startDate ?? '');
  const [endDate, setEndDate] = React.useState(contract?.endDate ?? '');

  React.useEffect(() => {
    if (open) {
      setContractType(contract?.contractType ?? '');
      setStartDate(contract?.startDate ?? '');
      setEndDate(contract?.endDate ?? '');
    }
  }, [open, contract]);

  const hasChanges =
    contractType !== (contract?.contractType ?? '') ||
    startDate !== (contract?.startDate ?? '') ||
    endDate !== (contract?.endDate ?? '');

  async function handleSave() {
    if (!hasChanges) return;

    const payload: UpdateEmployeeContractDto = {};

    if (contractType) {
      payload.contractType = contractType as UpdateEmployeeContractDto['contractType'];
    }
    if (startDate) {
      payload.startDate = startDate;
    }
    if (endDate) {
      payload.endDate = endDate as unknown as UpdateEmployeeContractDto['endDate'];
    }

    await amendMutation.mutateAsync(payload);

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[480px]'>
        <DialogHeader>
          <DialogTitle>{employeeUiCopy.contract.editTitle}</DialogTitle>
          <DialogDescription>
            {employeeUiCopy.contract.amendDescription}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='contractType'>{employeeUiCopy.contract.typeLabel}</Label>
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger id='contractType'>
                <SelectValue placeholder={employeeUiCopy.contract.typePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='startDate'>{employeeUiCopy.contract.startDateLabel}</Label>
            <Input
              id='startDate'
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='endDate'>{employeeUiCopy.contract.endDateLabel}</Label>
            <Input
              id='endDate'
              type='date'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            {commonUiCopy.cancel}
          </Button>
          <Button
            type='button'
            onClick={handleSave}
            disabled={!hasChanges || amendMutation.isPending}
          >
            {amendMutation.isPending ? (
              <>
                <Icons.spinner className='mr-1.5 size-4 animate-spin' />
                {commonUiCopy.saving}
              </>
            ) : (
              commonUiCopy.saveChanges
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
