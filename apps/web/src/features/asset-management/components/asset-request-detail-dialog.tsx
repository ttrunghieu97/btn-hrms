'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  requestDetailQueryOptions,
  assetCatalogQueryOptions,
  assetUnitsQueryOptions,
} from '../api/queries';
import {
  useSubmitAssetRequest,
  useCancelAssetRequest,
  useIssueAsset,
} from '../api/mutations';
import { extractList, unwrapData } from '@/lib/api-extract';
import type { AssetTypeRow, AssetUnitRow } from './status-maps';
import { formatDateVN } from '@/lib/date';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { GlobalWorkflowHero, type WorkflowStep } from '@/components/workflow/global-workflow-hero';
import { StatusBadge } from '@/components/ui/status-badge';
import { REQUEST_STATUS_MAP } from './status-maps';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AssetRequestDetailDialogProps {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ASSET_REQUEST_STEPS: WorkflowStep[] = [
  { key: 'draft', label: '1. Khởi tạo', description: 'Đề xuất thiết bị' },
  { key: 'pending_approval', label: '2. Chờ duyệt', description: 'Quản lý thẩm định' },
  { key: 'approved', label: '3. Chờ cấp phát', description: 'IT xuất kho' },
  { key: 'fulfilled', label: '4. Đã bàn giao', description: 'Hoàn tất bàn giao' },
];

export function AssetRequestDetailDialog({
  requestId,
  open,
  onOpenChange,
}: AssetRequestDetailDialogProps) {
  const { data: rawData, isLoading, refetch } = useQuery(
    requestDetailQueryOptions(requestId ?? ''),
  );

  const request = React.useMemo(() => {
    if (!rawData) return null;
    return unwrapData<any>(rawData);
  }, [rawData]);

  const { data: catalogData } = useQuery(assetCatalogQueryOptions({ limit: 500 }));
  const assetTypes = React.useMemo(
    () => extractList<AssetTypeRow>(catalogData),
    [catalogData],
  );

  const { data: unitData } = useQuery(
    assetUnitsQueryOptions({ limit: 500, status: 'available' }),
  );
  const availableUnits = React.useMemo(
    () => extractList<AssetUnitRow>(unitData),
    [unitData],
  );

  const submitMutation = useSubmitAssetRequest();
  const cancelMutation = useCancelAssetRequest();
  const issueMutation = useIssueAsset();

  const [fulfillmentOpen, setFulfillmentOpen] = React.useState(false);
  const [selectedAssetId, setSelectedAssetId] = React.useState('');
  const [fulfillmentNote, setFulfillmentNote] = React.useState('');

  const typeMap = React.useMemo(() => {
    const map = new Map<string, string>();
    assetTypes.forEach((t) => map.set(t.id, t.name ?? t.id));
    return map;
  }, [assetTypes]);

  if (!requestId) return null;

  const handleSubmit = () => {
    submitMutation.mutate(
      { id: requestId },
      {
        onSuccess: () => {
          notifyMutationSuccess('Đã gửi yêu cầu cấp phát thiết bị lên cấp quản lý.');
          void refetch();
        },
        onError: (err) => notifyMutationError(err, 'Không thể gửi yêu cầu.'),
      },
    );
  };

  const handleCancel = () => {
    cancelMutation.mutate(
      { id: requestId },
      {
        onSuccess: () => {
          notifyMutationSuccess('Đã hủy yêu cầu cấp phát thiết bị.');
          void refetch();
        },
        onError: (err) => notifyMutationError(err, 'Không thể hủy yêu cầu.'),
      },
    );
  };

  const handleFulfill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !request.lines?.[0]) return;
    const firstLine = request.lines[0];

    issueMutation.mutate(
      {
        employeeId: request.requesterEmployeeId,
        requestId: request.id,
        note: fulfillmentNote || `Cấp phát theo yêu cầu #${request.id.slice(0, 8)}`,
        lines: [
          {
            assetTypeId: firstLine.assetTypeId,
            quantity: firstLine.quantity || 1,
            ...(selectedAssetId && selectedAssetId !== 'none' ? { assetId: selectedAssetId } : {}),
            note: fulfillmentNote || undefined,
          },
        ],
      },
      {
        onSuccess: () => {
          notifyMutationSuccess('Đã xuất kho và cấp phát thiết bị thành công!');
          setFulfillmentOpen(false);
          void refetch();
        },
        onError: (err) => notifyMutationError(err, 'Lỗi xuất kho cấp phát.'),
      },
    );
  };

  const status = request?.status ?? 'draft';

  let currentStepIndex = 0;
  let failedStepIndex: number | undefined;
  let nextActor = 'Nhân viên (Người tạo yêu cầu)';
  let actionGuidance = 'Kiểm tra thông tin thiết bị và nộp yêu cầu để quản lý phê duyệt.';
  let actionResultPreview = 'Chuyển sang trạng thái Đang chờ duyệt.';
  const blockingConditions: string[] = [];

  if (status === 'draft') {
    currentStepIndex = 0;
    blockingConditions.push('Yêu cầu chưa nộp duyệt. Cần nộp yêu cầu để bắt đầu xét duyệt.');
  } else if (status === 'pending_approval') {
    currentStepIndex = 1;
    nextActor = 'Quản lý trực tiếp / Ban thẩm định thiết bị';
    actionGuidance = 'Đang chờ cấp quản lý xem xét và phê duyệt nhu cầu cấp phát.';
    actionResultPreview = 'Chuyển sang trạng thái Đã phê duyệt để bộ phận IT xuất kho.';
    blockingConditions.push('Cần phê duyệt từ cấp quản lý trước khi xuất kho bàn giao.');
  } else if (status === 'approved') {
    currentStepIndex = 2;
    nextActor = 'Bộ phận Quản trị Thiết bị / IT';
    actionGuidance = 'Yêu cầu đã được phê duyệt! Sẵn sàng gán thiết bị và xuất kho.';
    actionResultPreview = 'Chuyển sang trạng thái Đã cấp phát và cập nhật danh sách tài sản nắm giữ.';
  } else if (status === 'fulfilled') {
    currentStepIndex = 3;
    nextActor = 'Đã hoàn tất quy trình';
    actionGuidance = 'Thiết bị đã được bàn giao cho nhân viên thành công.';
    actionResultPreview = 'Tài sản đã được ghi nhận vào biên bản bàn giao của nhân viên.';
  } else if (status === 'rejected') {
    currentStepIndex = 1;
    failedStepIndex = 1;
    nextActor = 'Nhân viên (Người tạo yêu cầu)';
    actionGuidance = 'Yêu cầu cấp phát thiết bị đã bị từ chối.';
    actionResultPreview = 'Quy trình đã kết thúc.';
  } else if (status === 'cancelled') {
    currentStepIndex = 0;
    failedStepIndex = 0;
    nextActor = 'Quy trình đã hủy bỏ';
    actionGuidance = 'Yêu cầu này đã bị hủy bỏ bởi người tạo.';
    actionResultPreview = 'Quy trình đã kết thúc.';
  }

  // Compatible units matching the requested type
  const matchingUnits = availableUnits.filter((u) => {
    const requestedTypeId = request?.lines?.[0]?.assetTypeId;
    return !requestedTypeId || u.assetTypeId === requestedTypeId;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-lg'>
            <Icons.laptop className='size-5 text-primary' />
            <span>Yêu cầu cấp phát thiết bị #{requestId.slice(0, 8)}</span>
          </DialogTitle>
          <DialogDescription>
            Quy trình đề xuất, xét duyệt và xuất kho bàn giao thiết bị công nghệ cho nhân viên.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !request ? (
          <div className='flex items-center justify-center py-12'>
            <Icons.spinner className='size-6 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='space-y-6'>
            {/* Global Workflow Hero */}
            <GlobalWorkflowHero
              title={`Yêu cầu thiết bị #${request.id.slice(0, 8)}`}
              badge={<StatusBadge status={status} mapping={REQUEST_STATUS_MAP} />}
              subtitle={request.reason ? `Lý do: ${request.reason}` : undefined}
              steps={ASSET_REQUEST_STEPS}
              currentStepIndex={currentStepIndex}
              failedStepIndex={failedStepIndex}
              nextActor={nextActor}
              actionGuidance={actionGuidance}
              actionResultPreview={actionResultPreview}
              blockingConditions={blockingConditions.length > 0 ? blockingConditions : undefined}
              actions={
                <div className='flex items-center gap-2'>
                  {status === 'draft' && (
                    <Button
                      size='sm'
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending && (
                        <Icons.spinner className='mr-2 size-4 animate-spin' />
                      )}
                      <Icons.check className='mr-1.5 size-4' />
                      Nộp yêu cầu duyệt
                    </Button>
                  )}
                  {status === 'approved' && (
                    <Button
                      size='sm'
                      onClick={() => setFulfillmentOpen(true)}
                      disabled={issueMutation.isPending}
                      className='bg-indigo-600 hover:bg-indigo-700 text-white'
                    >
                      <Icons.product className='mr-1.5 size-4' />
                      Xuất kho & Cấp phát
                    </Button>
                  )}
                  {(status === 'draft' || status === 'pending_approval') && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleCancel}
                      disabled={cancelMutation.isPending}
                      className='text-destructive hover:bg-destructive/10'
                    >
                      <Icons.circleX className='mr-1.5 size-4' />
                      Hủy yêu cầu
                    </Button>
                  )}
                </div>
              }
            />

            {/* Requested Items & Specs */}
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm font-semibold uppercase tracking-wider text-muted-foreground'>
                  Danh sách thiết bị yêu cầu
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                {(request.lines ?? []).map((line: any, idx: number) => {
                  const typeName = typeMap.get(line.assetTypeId) ?? line.assetTypeId;
                  return (
                    <div
                      key={line.id ?? idx}
                      className='flex items-center justify-between rounded-lg border p-3 bg-muted/20'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                          <Icons.laptop className='size-5' />
                        </div>
                        <div>
                          <div className='font-medium text-sm'>{typeName}</div>
                          <div className='text-xs text-muted-foreground'>
                            Mã loại: {line.assetTypeId.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-semibold text-sm'>Số lượng: {line.quantity}</div>
                        {line.note && <div className='text-xs text-muted-foreground'>{line.note}</div>}
                      </div>
                    </div>
                  );
                })}

                <div className='grid grid-cols-2 gap-4 pt-2 text-xs border-t'>
                  <div>
                    <span className='text-muted-foreground'>Nhân viên yêu cầu: </span>
                    <span className='font-medium'>{request.requesterEmployeeId}</span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Hạn cần thiết bị: </span>
                    <span className='font-medium'>
                      {request.neededBy ? formatDateVN(request.neededBy) : 'Càng sớm càng tốt'}
                    </span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Thời điểm tạo: </span>
                    <span className='font-medium'>{formatDateVN(request.createdAt)}</span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Thời điểm nộp: </span>
                    <span className='font-medium'>
                      {request.submittedAt ? formatDateVN(request.submittedAt) : 'Chưa nộp'}
                    </span>
                  </div>
                  {request.decidedAt && (
                    <div>
                      <span className='text-muted-foreground'>Thời điểm duyệt: </span>
                      <span className='font-medium'>{formatDateVN(request.decidedAt)}</span>
                    </div>
                  )}
                  {request.fulfilledAt && (
                    <div>
                      <span className='text-muted-foreground'>Bàn giao lúc: </span>
                      <span className='font-medium text-emerald-600 dark:text-emerald-400'>
                        {formatDateVN(request.fulfilledAt)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Fulfillment Section for Approved Requests */}
            {status === 'approved' && fulfillmentOpen && (
              <Card className='border-indigo-200 bg-indigo-50/30 dark:border-indigo-900 dark:bg-indigo-950/20'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-semibold text-indigo-900 dark:text-indigo-200'>
                    Thực hiện Xuất kho & Gán thiết bị
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleFulfill} className='space-y-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='unitSelect' className='text-xs'>
                        Chọn thiết bị vật lý có sẵn (Serial / Mã tài sản)
                      </Label>
                      <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                        <SelectTrigger id='unitSelect' className='bg-background'>
                          <SelectValue placeholder='Chọn thiết bị cụ thể (nếu là thiết bị theo dõi)' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='none'>-- Xuất theo số lượng kho thông thường --</SelectItem>
                          {matchingUnits.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.serialNumber ? `S/N: ${u.serialNumber} (ID: ${u.id.slice(0, 8)})` : u.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className='text-[11px] text-muted-foreground'>
                        Nếu không chọn thiết bị cụ thể, hệ thống sẽ tự động trừ tồn kho loại tài sản này.
                      </p>
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='fulNote' className='text-xs'>Ghi chú bàn giao / Tình trạng máy</Label>
                      <Input
                        id='fulNote'
                        placeholder='Ví dụ: Máy mới 100%, kèm sạc và chuột không dây'
                        value={fulfillmentNote}
                        onChange={(e) => setFulfillmentNote(e.target.value)}
                        className='bg-background'
                      />
                    </div>

                    <div className='flex justify-end gap-2 pt-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => setFulfillmentOpen(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        type='submit'
                        size='sm'
                        disabled={issueMutation.isPending}
                        className='bg-indigo-600 hover:bg-indigo-700 text-white'
                      >
                        {issueMutation.isPending && (
                          <Icons.spinner className='mr-2 size-4 animate-spin' />
                        )}
                        Xác nhận Cấp phát & Bàn giao
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
