'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { commonUiCopy } from '@/lib/app-copy';
import { getQueryClient } from '@/lib/query-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import type { CreateLocationDtoType } from '@/api/generated/model';
import {
  departmentInvalidations,
  useLocationsTableQuery,
  type LocationMutationPayload
} from '../queries/department-queries';
import {
  createLocationMutation,
  updateLocationMutation,
  deleteLocationMutation
} from '../api/mutations';
import { LOCATION_TYPE_LABELS } from './locations-table/columns';

interface LocationFormSheetProps {
  locationId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationFormSheet({ locationId, open, onOpenChange }: LocationFormSheetProps) {
  const isEdit = Boolean(locationId);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const locationsQuery = useLocationsTableQuery();
  const location = React.useMemo(
    () => locationsQuery.data?.find((item) => item.id === locationId),
    [locationsQuery.data, locationId]
  );

  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<CreateLocationDtoType>('office');
  const [address, setAddress] = React.useState('');
  const [latitude, setLatitude] = React.useState('');
  const [longitude, setLongitude] = React.useState('');
  const [radiusMeters, setRadiusMeters] = React.useState('100');
  const [isLocating, setIsLocating] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (isEdit && location) {
      setName(location.name ?? '');
      setType(location.type ?? 'office');
      setAddress(location.address ?? '');
      setLatitude(location.latitude ? String(location.latitude) : '');
      setLongitude(location.longitude ? String(location.longitude) : '');
      setRadiusMeters(location.radiusMeters != null ? String(location.radiusMeters) : '100');
    } else {
      setName('');
      setType('office');
      setAddress('');
      setLatitude('');
      setLongitude('');
      setRadiusMeters('100');
    }
  }, [open, isEdit, location]);

  const deleteMutation = useMutation({
    ...deleteLocationMutation,
    onSuccess: async () => {
      await departmentInvalidations.locations(getQueryClient());
      toast.success('Đã xóa địa điểm làm việc');
      onOpenChange(false);
    }
  });

  const createMutation = useMutation({
    ...createLocationMutation,
    onSuccess: async () => {
      await departmentInvalidations.locations(getQueryClient());
      toast.success('Đã tạo địa điểm làm việc mới');
      onOpenChange(false);
    }
  });

  const updateMutation = useMutation({
    ...updateLocationMutation,
    onSuccess: async () => {
      await departmentInvalidations.locations(getQueryClient());
      toast.success('Đã cập nhật thông tin địa điểm');
      onOpenChange(false);
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleUseCurrentLocation = () => {
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
        toast.success('Đã lấy tọa độ GPS hiện tại');
      },
      () => {
        setIsLocating(false);
        toast.error('Không thể lấy tọa độ GPS. Vui lòng kiểm tra quyền truy cập vị trí.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên địa điểm');
      return;
    }

    const parsedLat = latitude.trim() ? Number(latitude) : undefined;
    const parsedLng = longitude.trim() ? Number(longitude) : undefined;
    const parsedRadius = radiusMeters.trim() ? Number(radiusMeters) : undefined;

    if (parsedLat !== undefined && Number.isNaN(parsedLat)) {
      toast.error('Vĩ độ (Latitude) không hợp lệ');
      return;
    }
    if (parsedLng !== undefined && Number.isNaN(parsedLng)) {
      toast.error('Kinh độ (Longitude) không hợp lệ');
      return;
    }
    if (parsedRadius !== undefined && (Number.isNaN(parsedRadius) || parsedRadius < 0)) {
      toast.error('Bán kính chấm công phải là số không âm');
      return;
    }

    const payload: LocationMutationPayload = {
      name: name.trim(),
      type,
      ...(address.trim() ? { address: address.trim() } : {}),
      ...(parsedLat !== undefined ? { latitude: parsedLat } : {}),
      ...(parsedLng !== undefined ? { longitude: parsedLng } : {}),
      ...(parsedRadius !== undefined ? { radiusMeters: parsedRadius } : {})
    };

    try {
      if (isEdit && locationId) {
        await updateMutation.mutateAsync({ id: locationId, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch {
      // Handled by global error handler
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col sm:max-w-lg'>
        <SheetHeader className='flex flex-row items-center justify-between border-b pb-4 space-y-0'>
          <div>
            <SheetTitle>{isEdit ? 'Cập nhật địa điểm' : 'Thêm địa điểm làm việc'}</SheetTitle>
            <SheetDescription>
              {isEdit
                ? 'Chỉnh sửa thông tin địa điểm và vùng bán kính chấm công GPS (Geofencing).'
                : 'Thiết lập văn phòng, nhà máy, kho bãi và vùng bán kính chấm công GPS.'}
            </SheetDescription>
          </div>
          <div className='flex items-center gap-2'>
            {isEdit && locationId && (
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button type='button' variant='destructive' size='sm' disabled={deleteMutation.isPending}>
                    <Icons.trash className='mr-1 h-4 w-4' />
                    {commonUiCopy.delete}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xóa địa điểm làm việc?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Hành động này sẽ xóa địa điểm làm việc khỏi danh mục cơ cấu tổ chức.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{commonUiCopy.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      onClick={() => deleteMutation.mutateAsync(locationId).catch(() => {})}
                    >
                      {commonUiCopy.delete}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type='button' variant='outline' size='sm' onClick={() => onOpenChange(false)}>
              {commonUiCopy.cancel}
            </Button>
            <Button
              type='submit'
              form='location-form-sheet'
              size='sm'
              isLoading={isPending || (isEdit && locationsQuery.isLoading)}
            >
              <Icons.check className='mr-1 h-4 w-4' />
              {isEdit ? commonUiCopy.saveChanges : 'Tạo địa điểm'}
            </Button>
          </div>
        </SheetHeader>

        <form id='location-form-sheet' onSubmit={handleSubmit} className='flex-1 overflow-auto space-y-4 p-4'>
          <div className='space-y-2'>
            <Label htmlFor='loc-name'>Tên địa điểm *</Label>
            <Input
              id='loc-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='VD: Văn phòng Trụ sở chính, Kho Bình Dương...'
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='loc-type'>Loại địa điểm *</Label>
            <Select value={type} onValueChange={(v) => setType(v as CreateLocationDtoType)}>
              <SelectTrigger id='loc-type'>
                <SelectValue placeholder='Chọn loại địa điểm' />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LOCATION_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='loc-address'>Địa chỉ thực tế</Label>
            <Input
              id='loc-address'
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder='Nhập địa chỉ chi tiết...'
            />
          </div>

          <div className='rounded-lg border p-3.5 space-y-3 bg-muted/20'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium'>Cấu hình tọa độ GPS (Geofencing)</p>
                <p className='text-xs text-muted-foreground'>
                  Dùng để đối chiếu vị trí khi nhân viên chấm công hoặc báo cáo vị trí.
                </p>
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
              >
                {isLocating ? 'Đang định vị...' : 'Lấy vị trí hiện tại'}
              </Button>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='loc-lat'>Vĩ độ (Latitude)</Label>
                <Input
                  id='loc-lat'
                  type='number'
                  step='any'
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder='VD: 10.762622'
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='loc-lng'>Kinh độ (Longitude)</Label>
                <Input
                  id='loc-lng'
                  type='number'
                  step='any'
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder='VD: 106.660172'
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='loc-radius'>Bán kính hợp lệ (mét)</Label>
              <Input
                id='loc-radius'
                type='number'
                min={0}
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                placeholder='VD: 100'
              />
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
