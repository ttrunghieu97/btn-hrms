'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  gPSLogsControllerCreate,
  gPSLogsControllerFindAll
} from '@/api/generated/gps-logs/gps-logs';
import type { CreateGPSLogDto, GPSLogsControllerFindAllParams } from '@/api/generated/model';
import { extractList } from '@/lib/api-extract';
import { createKeyFactory } from '@/lib/query-keys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Icons } from '@/components/icons';

export interface GPSLogItem {
  id: string;
  employeeId: string;
  latitude: string;
  longitude: string;
  timestamp: string;
}

const gpsLogKeys = createKeyFactory<GPSLogsControllerFindAllParams>('gps-logs');

export function GpsLogsView() {
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = React.useState<string>('');
  const [employeeIdFilter, setEmployeeIdFilter] = React.useState<string>('');
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [latitude, setLatitude] = React.useState('');
  const [longitude, setLongitude] = React.useState('');
  const [isLocating, setIsLocating] = React.useState(false);

  const queryParams = React.useMemo<GPSLogsControllerFindAllParams>(
    () => ({
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(employeeIdFilter.trim() ? { employeeId: employeeIdFilter.trim() } : {})
    }),
    [dateFilter, employeeIdFilter]
  );

  const logsQuery = useQuery({
    queryKey: gpsLogKeys.list(queryParams),
    queryFn: async ({ signal }) => {
      const response = await gPSLogsControllerFindAll(queryParams, { signal });
      return extractList<GPSLogItem>(response);
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (dto: CreateGPSLogDto) => gPSLogsControllerCreate(dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: gpsLogKeys.all() });
      toast.success('Đã ghi nhận tọa độ GPS thành công');
      setSubmitOpen(false);
      setLatitude('');
      setLongitude('');
    }
  });

  const handleLocateBrowser = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ định vị GPS');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setIsLocating(false);
        toast.success('Đã lấy vị trí hiện tại từ thiết bị');
      },
      () => {
        setIsLocating(false);
        toast.error('Không thể truy cập GPS. Bạn có thể nhập tọa độ thủ công.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!latitude.trim() || !longitude.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error('Vui lòng nhập tọa độ Vĩ độ (Latitude) và Kinh độ (Longitude) hợp lệ');
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Tọa độ nằm ngoài phạm vi hợp lệ (-90..90, -180..180)');
      return;
    }

    try {
      await submitMutation.mutateAsync({ latitude: lat, longitude: lng });
    } catch {
      // Handled by global error handler
    }
  };

  const logs = logsQuery.data ?? [];

  return (
    <div className='flex flex-1 flex-col gap-4 min-h-0'>
      <Card>
        <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4'>
          <div>
            <CardTitle className='text-lg'>Nhật ký định vị GPS (Hiện trường)</CardTitle>
            <CardDescription>
              Theo dõi lịch sử tọa độ báo cáo ngoài hiện trường và ghi nhận vị trí làm việc lưu động.
            </CardDescription>
          </div>
          <Button size='sm' onClick={() => setSubmitOpen(true)}>
            <Icons.add className='mr-1.5 h-4 w-4' />
            Ghi nhận vị trí GPS
          </Button>
        </CardHeader>

        <CardContent className='space-y-4'>
          <div className='flex flex-wrap items-end gap-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='gps-date-filter' className='text-xs'>
                Ngày ghi nhận
              </Label>
              <Input
                id='gps-date-filter'
                type='date'
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className='h-9 w-44'
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='gps-emp-filter' className='text-xs'>
                Mã định danh nhân viên (UUID)
              </Label>
              <Input
                id='gps-emp-filter'
                value={employeeIdFilter}
                onChange={(e) => setEmployeeIdFilter(e.target.value)}
                placeholder='Lọc theo ID nhân viên...'
                className='h-9 w-64'
              />
            </div>

            {(dateFilter || employeeIdFilter) && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => {
                  setDateFilter('');
                  setEmployeeIdFilter('');
                }}
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>

          <div className='rounded-lg border overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian ghi nhận</TableHead>
                  <TableHead>Nhân viên (ID)</TableHead>
                  <TableHead>Vĩ độ (Latitude)</TableHead>
                  <TableHead>Kinh độ (Longitude)</TableHead>
                  <TableHead className='text-right'>Bản đồ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className='h-24 text-center text-sm text-muted-foreground'>
                      Đang tải nhật ký định vị GPS...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='h-24 text-center text-sm text-muted-foreground'>
                      Chưa có dữ liệu định vị GPS nào phù hợp với bộ lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const formattedTime = log.timestamp
                      ? format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')
                      : '—';
                    const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(log.latitude)},${encodeURIComponent(log.longitude)}`;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className='font-medium'>{formattedTime}</TableCell>
                        <TableCell>
                          <Badge variant='outline' className='font-mono text-xs'>
                            {log.employeeId}
                          </Badge>
                        </TableCell>
                        <TableCell className='font-mono text-xs'>{log.latitude}</TableCell>
                        <TableCell className='font-mono text-xs'>{log.longitude}</TableCell>
                        <TableCell className='text-right'>
                          <a
                            href={mapsUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline'
                          >
                            Xem bản đồ
                            <Icons.externalLink className='h-3.5 w-3.5' />
                          </a>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Ghi nhận vị trí GPS hiện trường</DialogTitle>
            <DialogDescription>
              Lấy tọa độ tự động từ thiết bị của bạn hoặc nhập tọa độ GPS để gửi báo cáo vị trí.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='flex justify-end'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleLocateBrowser}
                disabled={isLocating}
              >
                {isLocating ? 'Đang lấy tọa độ...' : 'Lấy tọa độ thiết bị hiện tại'}
              </Button>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='submit-lat'>Vĩ độ (Latitude) *</Label>
                <Input
                  id='submit-lat'
                  type='number'
                  step='any'
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder='VD: 10.762622'
                  required
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='submit-lng'>Kinh độ (Longitude) *</Label>
                <Input
                  id='submit-lng'
                  type='number'
                  step='any'
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder='VD: 106.660172'
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setSubmitOpen(false)}>
                Hủy
              </Button>
              <Button type='submit' isLoading={submitMutation.isPending}>
                Gửi tọa độ GPS
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
