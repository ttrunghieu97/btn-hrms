'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { applicationInterviewsQueryOptions } from '../api/queries';
import {
  useScheduleInterview,
  useCompleteInterview,
  useSubmitInterviewScorecard,
} from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import { INTERVIEW_STATUS_MAP, type InterviewRow } from './status-maps';
import {
  notifyMutationError,
  notifyMutationSuccess,
} from '@/lib/mutation-feedback';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateVN } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { commonUiCopy, recruitmentUiCopy } from '@/lib/app-copy';

type InterviewType = 'phone' | 'video' | 'in_person' | 'technical' | 'panel';

const copy = recruitmentUiCopy.interviews;

const INTERVIEW_TYPES: Array<{ key: InterviewType; label: string }> = [
  { key: 'phone', label: copy.types.phone },
  { key: 'video', label: copy.types.video },
  { key: 'in_person', label: copy.types.in_person },
  { key: 'technical', label: copy.types.technical },
  { key: 'panel', label: copy.types.panel },
];

export function InterviewsPanel({ applicationId }: { applicationId: string }) {
  const { data, isLoading } = useQuery(
    applicationInterviewsQueryOptions(applicationId),
  );
  const interviews = extractList<InterviewRow>(data);

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex justify-end'>
        <ScheduleInterviewDialog applicationId={applicationId} />
      </div>
      {interviews.length === 0 && !isLoading ? (
        <p className='text-sm text-muted-foreground'>{copy.empty}</p>
      ) : (
        <ul className='flex flex-col gap-2'>
          {interviews.map((interview) => {
            const typeLabel =
              copy.types[interview.interviewType as keyof typeof copy.types] ??
              interview.interviewType ??
              '—';
            return (
              <li
                key={interview.id}
                className='flex items-center justify-between rounded-md border p-2.5'
              >
                <div className='flex flex-col gap-0.5'>
                  <span className='text-sm font-medium'>
                    {interview.title ?? '—'}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {typeLabel} ·{' '}
                    {interview.scheduledAt
                      ? formatDateVN(interview.scheduledAt)
                      : '—'}
                    {interview.durationMinutes
                      ? ` (${interview.durationMinutes}p)`
                      : ''}
                  </span>
                  {interview.location || interview.meetingLink ? (
                    <span className='text-xs text-muted-foreground'>
                      {interview.location ?? interview.meetingLink}
                    </span>
                  ) : null}
                </div>
                <div className='flex items-center gap-2'>
                  <StatusBadge
                    status={interview.status ?? ''}
                    mapping={INTERVIEW_STATUS_MAP}
                  />
                  <InterviewActions interview={interview} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function InterviewActions({ interview }: { interview: InterviewRow }) {
  const complete = useCompleteInterview();
  const submitScorecard = useSubmitInterviewScorecard();
  const [scoreOpen, setScoreOpen] = useState(false);
  const [rating, setRating] = useState('4');
  const [feedback, setFeedback] = useState('');

  const onComplete = async () => {
    try {
      await complete.mutateAsync({ id: interview.id, dto: {} });
      notifyMutationSuccess(copy.actions.complete);
    } catch (err) {
      notifyMutationError(err, copy.actions.complete);
    }
  };

  const onScoreSubmit = async () => {
    try {
      await submitScorecard.mutateAsync({
        id: interview.id,
        dto: {
          rating: Number(rating) || 4,
          ...(feedback ? { feedback } : {}),
        },
      });
      notifyMutationSuccess(copy.actions.scorecard);
      setScoreOpen(false);
      setFeedback('');
    } catch (err) {
      notifyMutationError(err, copy.actions.scorecard);
    }
  };

  if (interview.status === 'scheduled' || interview.status === 'rescheduled') {
    return (
      <Button
        variant='outline'
        size='sm'
        onClick={() => void onComplete()}
        disabled={complete.isPending}
      >
        {copy.actions.complete}
      </Button>
    );
  }

  if (interview.status === 'completed') {
    return (
      <>
        <Button variant='outline' size='sm' onClick={() => setScoreOpen(true)}>
          {copy.actions.scorecard}
        </Button>
        <Dialog open={scoreOpen} onOpenChange={setScoreOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{copy.actions.scorecard}</DialogTitle>
            </DialogHeader>
            <div className='grid gap-4 py-2'>
              <div className='grid gap-2'>
                <Label htmlFor={`iv-rating-${interview.id}`}>
                  {recruitmentUiCopy.candidates.pipeline.rating}
                </Label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger id={`iv-rating-${interview.id}`}>
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
                <Label htmlFor={`iv-feedback-${interview.id}`}>
                  {recruitmentUiCopy.candidates.pipeline.feedback}
                </Label>
                <Textarea
                  id={`iv-feedback-${interview.id}`}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setScoreOpen(false)}>
                {commonUiCopy.cancel}
              </Button>
              <Button
                onClick={() => void onScoreSubmit()}
                disabled={submitScorecard.isPending}
              >
                {commonUiCopy.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
}

function ScheduleInterviewDialog({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    interviewType: InterviewType;
    scheduledAt: string;
    durationMinutes: string;
    location: string;
    meetingLink: string;
    notes: string;
  }>({
    title: '',
    interviewType: 'video',
    scheduledAt: '',
    durationMinutes: '60',
    location: '',
    meetingLink: '',
    notes: '',
  });
  const schedule = useScheduleInterview();

  const onSchedule = async () => {
    try {
      await schedule.mutateAsync({
        applicationId,
        title: form.title.trim(),
        interviewType: form.interviewType,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes) || 60,
        ...(form.location ? { location: form.location } : {}),
        ...(form.meetingLink ? { meetingLink: form.meetingLink } : {}),
        ...(form.notes ? { notes: form.notes } : {}),
      });
      notifyMutationSuccess(copy.actions.schedule);
      setOpen(false);
      setForm({
        title: '',
        interviewType: 'video',
        scheduledAt: '',
        durationMinutes: '60',
        location: '',
        meetingLink: '',
        notes: '',
      });
    } catch (err) {
      notifyMutationError(err, copy.actions.schedule);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm'>
          {copy.actions.schedule}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.actions.schedule}</DialogTitle>
        </DialogHeader>
        <div className='grid gap-4 py-2'>
          <div className='grid gap-2'>
            <Label htmlFor='iv-title'>{copy.fields.title}</Label>
            <Input
              id='iv-title'
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='grid gap-2'>
              <Label htmlFor='iv-type'>{copy.fields.interviewType}</Label>
              <Select
                value={form.interviewType}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    interviewType: v as InterviewType,
                  }))
                }
              >
                <SelectTrigger id='iv-type'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_TYPES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='iv-duration'>{copy.fields.durationMinutes}</Label>
              <Input
                id='iv-duration'
                type='number'
                min={15}
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, durationMinutes: e.target.value }))
                }
              />
            </div>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='iv-scheduled'>{copy.fields.scheduledAt}</Label>
            <Input
              id='iv-scheduled'
              type='datetime-local'
              value={form.scheduledAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, scheduledAt: e.target.value }))
              }
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='iv-link'>{copy.fields.meetingLink}</Label>
            <Input
              id='iv-link'
              value={form.meetingLink}
              onChange={(e) =>
                setForm((f) => ({ ...f, meetingLink: e.target.value }))
              }
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='iv-location'>{copy.fields.location}</Label>
            <Input
              id='iv-location'
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='iv-notes'>{copy.fields.notes}</Label>
            <Textarea
              id='iv-notes'
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            {commonUiCopy.cancel}
          </Button>
          <Button
            onClick={() => void onSchedule()}
            disabled={
              schedule.isPending || !form.title.trim() || !form.scheduledAt
            }
          >
            {copy.actions.schedule}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
