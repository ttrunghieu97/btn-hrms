'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { applicationsQueryOptions, applicationDetailQueryOptions } from '../api/queries';
import {
  useAdvanceStage,
  useRejectApplication,
  useWithdrawApplication,
  useSubmitScorecard,
} from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import { unwrapData } from '@/lib/api-extract';
import { STAGE_MAP, type ApplicationRow } from './status-maps';
import type { AdvanceStageDtoToStage } from '@/api/generated/model';
import {
  notifyMutationError,
  notifyMutationSuccess,
} from '@/lib/mutation-feedback';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { commonUiCopy, recruitmentUiCopy } from '@/lib/app-copy';
import { OffersPanel } from './offers-view';

const copy = recruitmentUiCopy.candidates;

/** Board columns: active stages left-to-right, plus a terminal bucket. */
const BOARD_STAGES: Array<{ key: string; label: string }> = [
  { key: 'applied', label: recruitmentUiCopy.stages.applied },
  { key: 'screening', label: recruitmentUiCopy.stages.screening },
  { key: 'interview', label: recruitmentUiCopy.stages.interview },
  { key: 'offer', label: recruitmentUiCopy.stages.offer },
  { key: 'hired', label: recruitmentUiCopy.stages.hired },
];

const ADVANCE_TARGETS: Record<string, AdvanceStageDtoToStage[]> = {
  applied: ['screening'],
  screening: ['interview'],
  interview: ['offer'],
  offer: ['hired'],
};

export function CandidatesView() {
  const { data, error, isLoading, refetch } = useQuery(
    applicationsQueryOptions({ page: 1, limit: 100 }),
  );
  const applications = extractList<ApplicationRow>(data);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  if (applications.length === 0 && !isLoading) {
    return (
      <AppEmptyState
        icon={<Icons.page className='size-10' />}
        title={copy.empty}
        compact
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <h2 className='text-lg font-semibold'>{copy.title}</h2>
      <div className='flex gap-4 overflow-x-auto pb-2'>
        {BOARD_STAGES.map((stage) => {
          const cards = applications.filter((a) => a.currentStage === stage.key);
          return (
            <div key={stage.key} className='flex w-64 shrink-0 flex-col gap-2'>
              <div className='flex items-center justify-between px-1'>
                <span className='text-sm font-medium'>{stage.label}</span>
                <span className='text-xs text-muted-foreground'>
                  {cards.length}
                </span>
              </div>
              <div className='flex flex-col gap-2'>
                {cards.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    onOpen={() => setSelectedId(app.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedId ? (
        <ApplicationDetailDialog
          applicationId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}

function ApplicationCard({
  app,
  onOpen,
}: {
  app: ApplicationRow;
  onOpen: () => void;
}) {
  const advance = useAdvanceStage();
  const targets = ADVANCE_TARGETS[app.currentStage ?? ''] ?? [];

  const onAdvance = async (toStage: AdvanceStageDtoToStage) => {
    try {
      await advance.mutateAsync({ id: app.id, dto: { toStage } });
      notifyMutationSuccess(copy.pipeline.advance);
    } catch (err) {
      notifyMutationError(err, copy.pipeline.advance);
    }
  };

  return (
    <Card className='cursor-pointer transition-colors hover:border-primary'>
      <CardContent className='flex flex-col gap-2 p-3'>
        <button
          type='button'
          className='text-left text-sm font-medium hover:underline'
          onClick={onOpen}
        >
          {app.candidate?.fullName ?? app.candidateId?.slice(0, 8) ?? '—'}
        </button>
        <span className='truncate text-xs text-muted-foreground'>
          {app.candidate?.email ?? '—'}
        </span>
        {targets.length > 0 ? (
          <div className='flex flex-wrap gap-1'>
            {targets.map((t) => (
              <Button
                key={t}
                variant='outline'
                size='sm'
                className='h-7 px-2 text-xs'
                disabled={advance.isPending}
                onClick={() => void onAdvance(t)}
              >
                {STAGE_MAP[t]?.label ?? t}
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ApplicationDetailDialog({
  applicationId,
  onClose,
}: {
  applicationId: string;
  onClose: () => void;
}) {
  const { data } = useQuery(applicationDetailQueryOptions(applicationId));
  const app = unwrapData<ApplicationRow>(data);

  const reject = useRejectApplication();
  const withdraw = useWithdrawApplication();

  const onReject = async () => {
    try {
      await reject.mutateAsync({ id: applicationId, dto: {} });
      notifyMutationSuccess(copy.pipeline.reject);
    } catch (err) {
      notifyMutationError(err, copy.pipeline.reject);
    }
  };

  const onWithdraw = async () => {
    try {
      await withdraw.mutateAsync({ id: applicationId, dto: {} });
      notifyMutationSuccess(copy.pipeline.withdraw);
    } catch (err) {
      notifyMutationError(err, copy.pipeline.withdraw);
    }
  };

  const isActive =
    app?.currentStage &&
    !['hired', 'rejected', 'withdrawn'].includes(app.currentStage);

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className='max-h-[85vh] max-w-2xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{copy.detailTitle}</DialogTitle>
        </DialogHeader>

        {app ? (
          <div className='flex flex-col gap-4'>
            <section className='flex flex-col gap-1'>
              <h3 className='text-sm font-semibold'>{copy.sections.profile}</h3>
              <div className='flex items-center gap-2'>
                <span className='font-medium'>{app.candidate?.fullName ?? '—'}</span>
                <StatusBadge status={app.currentStage ?? ''} mapping={STAGE_MAP} />
              </div>
              <span className='text-sm text-muted-foreground'>
                {app.candidate?.email ?? '—'} · {app.candidate?.phone ?? '—'}
              </span>
            </section>

            {isActive ? (
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => void onReject()}
                  disabled={reject.isPending}
                >
                  {copy.pipeline.reject}
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => void onWithdraw()}
                  disabled={withdraw.isPending}
                >
                  {copy.pipeline.withdraw}
                </Button>
              </div>
            ) : null}

            <ScorecardsSection app={app} />

            <section className='flex flex-col gap-2'>
              <h3 className='text-sm font-semibold'>{copy.sections.pipeline}</h3>
              {app.stageEvents && app.stageEvents.length > 0 ? (
                <ol className='flex flex-col gap-1 text-sm'>
                  {app.stageEvents.map((e) => (
                    <li key={e.id} className='flex items-center gap-2'>
                      <span className='text-muted-foreground'>
                        {e.fromStage ? `${STAGE_MAP[e.fromStage]?.label ?? e.fromStage} → ` : ''}
                      </span>
                      <StatusBadge status={e.toStage ?? ''} mapping={STAGE_MAP} />
                      {e.note ? (
                        <span className='text-muted-foreground'>· {e.note}</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className='text-sm text-muted-foreground'>
                  {copy.pipeline.emptyEvents}
                </p>
              )}
            </section>

            <section className='flex flex-col gap-2'>
              <h3 className='text-sm font-semibold'>{copy.sections.offers}</h3>
              <OffersPanel applicationId={applicationId} />
            </section>
          </div>
        ) : (
          <p className='text-sm text-muted-foreground'>{commonUiCopy.loading}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ScorecardsSection({ app }: { app: ApplicationRow }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState('3');
  const [feedback, setFeedback] = useState('');
  const submit = useSubmitScorecard();

  const canScore = app.currentStage === 'interview';

  const onSubmit = async () => {
    try {
      await submit.mutateAsync({
        id: app.id,
        dto: {
          rating: Number(rating) || 3,
          ...(feedback ? { feedback } : {}),
        },
      });
      notifyMutationSuccess(copy.pipeline.addScorecard);
      setOpen(false);
      setFeedback('');
    } catch (err) {
      notifyMutationError(err, copy.pipeline.addScorecard);
    }
  };

  return (
    <section className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-semibold'>{copy.sections.scorecards}</h3>
        {canScore ? (
          <Button variant='outline' size='sm' onClick={() => setOpen(true)}>
            {copy.pipeline.addScorecard}
          </Button>
        ) : null}
      </div>
      {app.scorecards && app.scorecards.length > 0 ? (
        <ul className='flex flex-col gap-1 text-sm'>
          {app.scorecards.map((s) => (
            <li key={s.id} className='flex items-center gap-2'>
              <span className='font-medium'>{s.rating}/5</span>
              {s.feedback ? (
                <span className='text-muted-foreground'>{s.feedback}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className='text-sm text-muted-foreground'>
          {copy.pipeline.emptyScorecards}
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.pipeline.addScorecard}</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-2'>
            <div className='grid gap-2'>
              <Label htmlFor='sc-rating'>{copy.pipeline.rating}</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger id='sc-rating'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='sc-feedback'>{copy.pipeline.feedback}</Label>
              <Textarea
                id='sc-feedback'
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              {commonUiCopy.cancel}
            </Button>
            <Button onClick={() => void onSubmit()} disabled={submit.isPending}>
              {commonUiCopy.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
