import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  requisitionsControllerCreate,
  requisitionsControllerUpdate,
  requisitionsControllerSubmit,
  requisitionsControllerClose,
  postingsControllerPublish,
  postingsControllerUpdate,
  postingsControllerChangeStatus,
  candidatesControllerSubmit,
  candidatesControllerAttach,
  pipelineControllerAdvance,
  pipelineControllerReject,
  pipelineControllerWithdraw,
  pipelineControllerScorecard,
  offersControllerDraft,
  offersControllerSubmit,
  offersControllerDecide,
} from '@/api/generated/endpoints';
import type {
  CreateRequisitionDto,
  UpdateRequisitionDto,
  CreatePostingDto,
  UpdatePostingDto,
  ChangePostingStatusDto,
  SubmitApplicationDto,
  AttachCvDto,
  AdvanceStageDto,
  RejectApplicationDto,
  SubmitScorecardDto,
  CreateOfferDto,
  DecideOfferDto,
} from '@/api/generated/model';
import {
  requisitionKeys,
  postingKeys,
  applicationKeys,
  offerKeys,
} from '../queries/recruitment-queries';

// --- Requisitions ---

export function useCreateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateRequisitionDto) => requisitionsControllerCreate(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: requisitionKeys.all() }),
  });
}

export function useUpdateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateRequisitionDto }) =>
      requisitionsControllerUpdate(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: requisitionKeys.all() }),
  });
}

export function useSubmitRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => requisitionsControllerSubmit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: requisitionKeys.all() }),
  });
}

export function useCloseRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => requisitionsControllerClose(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: requisitionKeys.all() }),
  });
}

// --- Postings ---

export function usePublishPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePostingDto) => postingsControllerPublish(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: postingKeys.all() }),
  });
}

export function useUpdatePosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePostingDto }) =>
      postingsControllerUpdate(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: postingKeys.all() }),
  });
}

export function useChangePostingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ChangePostingStatusDto }) =>
      postingsControllerChangeStatus(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: postingKeys.all() }),
  });
}

// --- Candidates / Applications ---

export function useSubmitApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: SubmitApplicationDto) => candidatesControllerSubmit(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all() }),
  });
}

export function useAttachCv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AttachCvDto }) =>
      candidatesControllerAttach(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all() }),
  });
}

// --- Pipeline ---

export function useAdvanceStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AdvanceStageDto }) =>
      pipelineControllerAdvance(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all() }),
  });
}

export function useRejectApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RejectApplicationDto }) =>
      pipelineControllerReject(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all() }),
  });
}

export function useWithdrawApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RejectApplicationDto }) =>
      pipelineControllerWithdraw(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all() }),
  });
}

export function useSubmitScorecard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SubmitScorecardDto }) =>
      pipelineControllerScorecard(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all() }),
  });
}

// --- Offers ---

export function useDraftOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateOfferDto) => offersControllerDraft(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: offerKeys.all() }),
  });
}

export function useSubmitOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => offersControllerSubmit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: offerKeys.all() }),
  });
}

export function useDecideOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: DecideOfferDto }) =>
      offersControllerDecide(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: offerKeys.all() }),
  });
}
