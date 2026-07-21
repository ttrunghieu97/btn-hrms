'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { applicationOffersQueryOptions } from '../api/queries';
import {
  useDraftOffer,
  useSubmitOffer,
  useDecideOffer,
} from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import { OFFER_STATUS_MAP, type OfferRow } from './status-maps';
import {
  notifyMutationError,
  notifyMutationSuccess,
} from '@/lib/mutation-feedback';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { commonUiCopy, recruitmentUiCopy } from '@/lib/app-copy';

const copy = recruitmentUiCopy.offers;

/**
 * OffersPanel — embedded in the application detail dialog. Offers are scoped
 * to a single application (the API list requires an applicationId).
 */
export function OffersPanel({ applicationId }: { applicationId: string }) {
  const { data, isLoading } = useQuery(
    applicationOffersQueryOptions(applicationId),
  );
  const offers = extractList<OfferRow>(data);

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex justify-end'>
        <DraftOfferDialog applicationId={applicationId} />
      </div>
      {offers.length === 0 && !isLoading ? (
        <p className='text-sm text-muted-foreground'>{copy.empty}</p>
      ) : (
        <ul className='flex flex-col gap-2'>
          {offers.map((offer) => (
            <li
              key={offer.id}
              className='flex items-center justify-between rounded-md border p-2'
            >
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>
                  {offer.compensation ?? '—'}
                </span>
                <span className='text-xs text-muted-foreground'>
                  {copy.columns.startDate}: {offer.startDate ?? '—'}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <StatusBadge
                  status={offer.status ?? ''}
                  mapping={OFFER_STATUS_MAP}
                />
                <OfferActions offer={offer} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OfferActions({ offer }: { offer: OfferRow }) {
  const submit = useSubmitOffer();
  const decide = useDecideOffer();

  const onSubmit = async () => {
    try {
      await submit.mutateAsync({ id: offer.id });
      notifyMutationSuccess(copy.actions.submit);
    } catch (err) {
      notifyMutationError(err, copy.actions.submit);
    }
  };

  const onDecide = async (decision: 'accept' | 'decline', label: string) => {
    try {
      await decide.mutateAsync({ id: offer.id, dto: { decision } });
      notifyMutationSuccess(label);
    } catch (err) {
      notifyMutationError(err, label);
    }
  };

  if (offer.status === 'draft') {
    return (
      <Button
        variant='outline'
        size='sm'
        onClick={() => void onSubmit()}
        disabled={submit.isPending}
      >
        {copy.actions.submit}
      </Button>
    );
  }

  if (offer.status === 'approved') {
    return (
      <div className='flex gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => void onDecide('accept', copy.actions.accept)}
          disabled={decide.isPending}
        >
          {copy.actions.accept}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => void onDecide('decline', copy.actions.decline)}
          disabled={decide.isPending}
        >
          {copy.actions.decline}
        </Button>
      </div>
    );
  }

  return null;
}

function DraftOfferDialog({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    compensation: '',
    startDate: '',
    expiresAt: '',
  });
  const draft = useDraftOffer();

  const onDraft = async () => {
    try {
      await draft.mutateAsync({
        applicationId,
        compensation: form.compensation,
        startDate: form.startDate,
        ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),
      });
      notifyMutationSuccess(copy.actions.draft);
      setOpen(false);
      setForm({ compensation: '', startDate: '', expiresAt: '' });
    } catch (err) {
      notifyMutationError(err, copy.actions.draft);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm'>
          {copy.actions.draft}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.actions.draft}</DialogTitle>
        </DialogHeader>
        <div className='grid gap-4 py-2'>
          <div className='grid gap-2'>
            <Label htmlFor='offer-comp'>{copy.columns.compensation}</Label>
            <Input
              id='offer-comp'
              value={form.compensation}
              onChange={(e) =>
                setForm((f) => ({ ...f, compensation: e.target.value }))
              }
              placeholder='2000.00'
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='offer-start'>{copy.columns.startDate}</Label>
            <Input
              id='offer-start'
              type='date'
              value={form.startDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, startDate: e.target.value }))
              }
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='offer-expires'>{copy.columns.expiresAt}</Label>
            <Input
              id='offer-expires'
              type='date'
              value={form.expiresAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, expiresAt: e.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            {commonUiCopy.cancel}
          </Button>
          <Button
            onClick={() => void onDraft()}
            disabled={draft.isPending || !form.compensation || !form.startDate}
          >
            {copy.actions.draft}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
