'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getWorkflowDefinitionControllerListQueryKey,
  getWorkflowInstanceControllerListQueryKey,
  useWorkflowDefinitionControllerList,
  useWorkflowInstanceControllerCancel,
  useWorkflowInstanceControllerCreate,
  useWorkflowInstanceControllerList,
  useWorkflowInstanceControllerTransition,
} from '@/api/generated/workflow-engine/workflow-engine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';

interface WorkflowDefinitionItem {
  id: string;
  key: string;
  name?: string;
  description?: string;
  version?: number;
  initialState?: string;
  isActive?: boolean;
  states?: Record<string, unknown> | unknown[];
  transitions?: unknown[];
  updatedAt?: string;
}

interface WorkflowInstanceItem {
  id: string;
  definitionId?: string;
  definitionKey?: string;
  key?: string;
  subjectType: string;
  subjectId: string;
  currentState: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

function extractList<T>(raw: unknown): T[] {
  if (!raw || typeof raw !== 'object') return [];
  const envelope = raw as Record<string, unknown>;
  const inner = envelope.data !== undefined ? envelope.data : envelope;
  if (Array.isArray(inner)) return inner as T[];
  if (inner && typeof inner === 'object') {
    const obj = inner as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}

export function WorkflowAdminView() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [startDialogOpen, setStartDialogOpen] = React.useState(false);
  const [transitionDialogOpen, setTransitionDialogOpen] = React.useState(false);
  const [selectedInstance, setSelectedInstance] = React.useState<WorkflowInstanceItem | null>(null);
  const [selectedDef, setSelectedDef] = React.useState<WorkflowDefinitionItem | null>(null);

  // Start Instance Form State
  const [startKey, setStartKey] = React.useState('');
  const [subjectType, setSubjectType] = React.useState('leave_request');
  const [subjectId, setSubjectId] = React.useState('');
  const [metadataJson, setMetadataJson] = React.useState('{}');

  // Transition Form State
  const [transitionName, setTransitionName] = React.useState('');
  const [payloadJson, setPayloadJson] = React.useState('{}');

  const definitionsQuery = useWorkflowDefinitionControllerList({
    page: '1',
    limit: '50',
  });

  const instancesQuery = useWorkflowInstanceControllerList({
    page: 1,
    limit: 50,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  });

  const definitions = React.useMemo(
    () => extractList<WorkflowDefinitionItem>(definitionsQuery.data),
    [definitionsQuery.data]
  );

  const instances = React.useMemo(
    () => extractList<WorkflowInstanceItem>(instancesQuery.data),
    [instancesQuery.data]
  );

  const createInstanceMutation = useWorkflowInstanceControllerCreate({
    mutation: {
      onSuccess: () => {
        toast.success('Đã khởi chạy quy trình mới thành công');
        setStartDialogOpen(false);
        setSubjectId('');
        setMetadataJson('{}');
        void queryClient.invalidateQueries({
          queryKey: getWorkflowInstanceControllerListQueryKey(),
        });
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Không thể khởi chạy quy trình';
        toast.error(message);
      },
    },
  });

  const transitionMutation = useWorkflowInstanceControllerTransition({
    mutation: {
      onSuccess: () => {
        toast.success('Đã chuyển trạng thái quy trình thành công');
        setTransitionDialogOpen(false);
        setSelectedInstance(null);
        setTransitionName('');
        setPayloadJson('{}');
        void queryClient.invalidateQueries({
          queryKey: getWorkflowInstanceControllerListQueryKey(),
        });
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Không thể chuyển trạng thái';
        toast.error(message);
      },
    },
  });

  const cancelMutation = useWorkflowInstanceControllerCancel({
    mutation: {
      onSuccess: () => {
        toast.success('Đã hủy phiên quy trình');
        void queryClient.invalidateQueries({
          queryKey: getWorkflowInstanceControllerListQueryKey(),
        });
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Không thể hủy quy trình';
        toast.error(message);
      },
    },
  });

  const handleStartInstance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startKey.trim() || !subjectType.trim() || !subjectId.trim()) {
      toast.error('Vui lòng nhập đầy đủ mã quy trình, loại đối tượng và mã đối tượng');
      return;
    }
    let parsedMetadata: Record<string, unknown> = {};
    if (metadataJson.trim()) {
      try {
        parsedMetadata = JSON.parse(metadataJson) as Record<string, unknown>;
      } catch {
        toast.error('Metadata JSON không hợp lệ');
        return;
      }
    }
    createInstanceMutation.mutate({
      data: {
        key: startKey.trim(),
        subjectType: subjectType.trim(),
        subjectId: subjectId.trim(),
        metadata: parsedMetadata,
      },
    });
  };

  const handleTransition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstance || !transitionName.trim()) {
      toast.error('Vui lòng nhập tên bước chuyển (transition)');
      return;
    }
    let parsedPayload: Record<string, unknown> = {};
    if (payloadJson.trim()) {
      try {
        parsedPayload = JSON.parse(payloadJson) as Record<string, unknown>;
      } catch {
        toast.error('Payload JSON không hợp lệ');
        return;
      }
    }
    transitionMutation.mutate({
      id: selectedInstance.id,
      data: {
        transition: transitionName.trim(),
        payload: parsedPayload,
      },
    });
  };

  const openStartWithKey = (key: string) => {
    setStartKey(key);
    setStartDialogOpen(true);
  };

  const openTransitionModal = (instance: WorkflowInstanceItem) => {
    setSelectedInstance(instance);
    setTransitionName('');
    setPayloadJson('{}');
    setTransitionDialogOpen(true);
  };

  const renderStatusBadge = (status: string) => {
    const normalized = status.toUpperCase();
    if (normalized === 'ACTIVE' || normalized === 'RUNNING' || normalized === 'IN_PROGRESS') {
      return <Badge variant='default'>{status}</Badge>;
    }
    if (normalized === 'COMPLETED' || normalized === 'APPROVED') {
      return <Badge variant='secondary'>{status}</Badge>;
    }
    if (normalized === 'CANCELLED' || normalized === 'FAILED' || normalized === 'REJECTED') {
      return <Badge variant='destructive'>{status}</Badge>;
    }
    return <Badge variant='outline'>{status}</Badge>;
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Quản trị Quy trình động (Workflow Engine)</h1>
          <p className='text-muted-foreground text-sm'>
            Giám sát định nghĩa máy trạng thái (State Machine) và điều phối các phiên quy trình nghiệp vụ đang chạy.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              void queryClient.invalidateQueries({
                queryKey: getWorkflowDefinitionControllerListQueryKey(),
              });
              void queryClient.invalidateQueries({
                queryKey: getWorkflowInstanceControllerListQueryKey(),
              });
            }}
          >
            <Icons.spinner className='mr-2 h-4 w-4' />
            Làm mới
          </Button>
          <Button size='sm' onClick={() => setStartDialogOpen(true)}>
            <Icons.add className='mr-2 h-4 w-4' />
            Khởi chạy quy trình
          </Button>
        </div>
      </div>

      <Tabs defaultValue='instances' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='instances'>
            Phiên thực thi ({instances.length})
          </TabsTrigger>
          <TabsTrigger value='definitions'>
            Định nghĩa quy trình ({definitions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value='instances' className='space-y-4'>
          <Card>
            <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <CardTitle>Danh sách phiên thực thi (Workflow Instances)</CardTitle>
                <CardDescription>
                  Theo dõi trạng thái hiện tại, chuyển bước (transition) hoặc hủy phiên thực thi.
                </CardDescription>
              </div>
              <div className='w-full sm:w-48'>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder='Lọc trạng thái' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ALL'>Tất cả trạng thái</SelectItem>
                    <SelectItem value='ACTIVE'>Đang chạy (ACTIVE)</SelectItem>
                    <SelectItem value='COMPLETED'>Hoàn tất (COMPLETED)</SelectItem>
                    <SelectItem value='CANCELLED'>Đã hủy (CANCELLED)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {instancesQuery.isLoading ? (
                <div className='text-muted-foreground py-12 text-center text-sm'>
                  Đang tải danh sách phiên quy trình...
                </div>
              ) : instances.length === 0 ? (
                <div className='text-muted-foreground py-12 text-center text-sm'>
                  Chưa có phiên thực thi quy trình nào. Nhấn &ldquo;Khởi chạy quy trình&rdquo; để bắt đầu.
                </div>
              ) : (
                <div className='rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID Phiên</TableHead>
                        <TableHead>Quy trình</TableHead>
                        <TableHead>Đối tượng (Subject)</TableHead>
                        <TableHead>Trạng thái hiện tại (State)</TableHead>
                        <TableHead>Tình trạng</TableHead>
                        <TableHead>Thời gian tạo</TableHead>
                        <TableHead className='text-right'>Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {instances.map((item) => {
                        const isTerminal =
                          item.status?.toUpperCase() === 'CANCELLED' ||
                          item.status?.toUpperCase() === 'COMPLETED';
                        return (
                          <TableRow key={item.id}>
                            <TableCell className='font-mono text-xs'>
                              {item.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className='font-medium'>
                              {item.definitionKey ?? item.key ?? item.definitionId ?? '—'}
                            </TableCell>
                            <TableCell>
                              <div className='flex flex-col'>
                                <span className='text-xs font-medium'>{item.subjectType}</span>
                                <span className='text-muted-foreground font-mono text-xs'>
                                  {item.subjectId}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant='outline' className='font-mono'>
                                {item.currentState}
                              </Badge>
                            </TableCell>
                            <TableCell>{renderStatusBadge(item.status)}</TableCell>
                            <TableCell className='text-muted-foreground text-xs'>
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleString('vi-VN')
                                : '—'}
                            </TableCell>
                            <TableCell className='text-right'>
                              <div className='flex items-center justify-end gap-2'>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  disabled={isTerminal}
                                  onClick={() => openTransitionModal(item)}
                                >
                                  Chuyển bước
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  disabled={isTerminal || cancelMutation.isPending}
                                  onClick={() => cancelMutation.mutate({ id: item.id })}
                                >
                                  Hủy
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='definitions' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Định nghĩa quy trình (Workflow Definitions)</CardTitle>
              <CardDescription>
                Các mẫu quy trình chuẩn được cấu hình trong hệ thống.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {definitionsQuery.isLoading ? (
                <div className='text-muted-foreground py-12 text-center text-sm'>
                  Đang tải danh sách định nghĩa quy trình...
                </div>
              ) : definitions.length === 0 ? (
                <div className='text-muted-foreground py-12 text-center text-sm'>
                  Chưa có định nghĩa quy trình nào trong hệ thống.
                </div>
              ) : (
                <div className='rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã quy trình (Key)</TableHead>
                        <TableHead>Tên quy trình</TableHead>
                        <TableHead>Phiên bản</TableHead>
                        <TableHead>Trạng thái khởi đầu</TableHead>
                        <TableHead>Tình trạng</TableHead>
                        <TableHead className='text-right'>Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {definitions.map((def) => (
                        <TableRow key={def.id ?? def.key}>
                          <TableCell className='font-mono font-medium'>{def.key}</TableCell>
                          <TableCell>
                            <div className='flex flex-col'>
                              <span>{def.name ?? def.key}</span>
                              {def.description && (
                                <span className='text-muted-foreground text-xs'>
                                  {def.description}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>v{def.version ?? 1}</TableCell>
                          <TableCell>
                            <Badge variant='outline' className='font-mono'>
                              {def.initialState ?? 'INIT'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={def.isActive !== false ? 'default' : 'secondary'}>
                              {def.isActive !== false ? 'Đang kích hoạt' : 'Tạm ngưng'}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='flex items-center justify-end gap-2'>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => setSelectedDef(def)}
                              >
                                Chi tiết
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => openStartWithKey(def.key)}
                              >
                                Khởi chạy
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog khởi chạy quy trình */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Khởi chạy phiên quy trình mới</DialogTitle>
            <DialogDescription>
              Tạo một phiên thực thi (Workflow Instance) gắn với đối tượng nghiệp vụ cụ thể.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStartInstance} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='wf-key'>Mã quy trình (Definition Key)</Label>
              <Input
                id='wf-key'
                placeholder='VD: leave_approval_v1, onboarding_flow...'
                value={startKey}
                onChange={(e) => setStartKey(e.target.value)}
                required
              />
            </div>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='wf-subject-type'>Loại đối tượng (Subject Type)</Label>
                <Input
                  id='wf-subject-type'
                  placeholder='VD: leave_request, contract...'
                  value={subjectType}
                  onChange={(e) => setSubjectType(e.target.value)}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='wf-subject-id'>Mã đối tượng (Subject ID)</Label>
                <Input
                  id='wf-subject-id'
                  placeholder='UUID hoặc mã hồ sơ'
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='wf-metadata'>Metadata (JSON tùy chọn)</Label>
              <Textarea
                id='wf-metadata'
                rows={3}
                className='font-mono text-xs'
                value={metadataJson}
                onChange={(e) => setMetadataJson(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setStartDialogOpen(false)}
              >
                Đóng
              </Button>
              <Button type='submit' disabled={createInstanceMutation.isPending}>
                {createInstanceMutation.isPending ? 'Đang khởi chạy...' : 'Khởi chạy'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog chuyển trạng thái */}
      <Dialog open={transitionDialogOpen} onOpenChange={setTransitionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chuyển trạng thái quy trình (Transition)</DialogTitle>
            <DialogDescription>
              Phiên: <span className='font-mono'>{selectedInstance?.id}</span> — Trạng thái hiện tại:{' '}
              <Badge variant='outline' className='font-mono'>
                {selectedInstance?.currentState}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransition} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='wf-transition'>Tên bước chuyển (Transition Event)</Label>
              <Input
                id='wf-transition'
                placeholder='VD: APPROVE, REJECT, SUBMIT, COMPLETE...'
                value={transitionName}
                onChange={(e) => setTransitionName(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='wf-payload'>Payload đính kèm (JSON tùy chọn)</Label>
              <Textarea
                id='wf-payload'
                rows={3}
                className='font-mono text-xs'
                value={payloadJson}
                onChange={(e) => setPayloadJson(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setTransitionDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button type='submit' disabled={transitionMutation.isPending}>
                {transitionMutation.isPending ? 'Đang xử lý...' : 'Thực thi chuyển bước'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog xem chi tiết định nghĩa */}
      <Dialog open={Boolean(selectedDef)} onOpenChange={(open) => !open && setSelectedDef(null)}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Chi tiết định nghĩa: {selectedDef?.name ?? selectedDef?.key}</DialogTitle>
            <DialogDescription>
              Mã định danh: <span className='font-mono'>{selectedDef?.key}</span> (v
              {selectedDef?.version ?? 1})
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='rounded-md bg-muted p-3 font-mono text-xs overflow-auto max-h-80'>
              <pre>{JSON.stringify(selectedDef, null, 2)}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setSelectedDef(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
