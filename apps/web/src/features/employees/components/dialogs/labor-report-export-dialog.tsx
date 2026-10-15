'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  laborReportControllerExport,
  laborReportControllerExportDocx
} from '@/api/generated/labor-reports/labor-reports';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function LaborReportExportDialog() {
  const currentYear = new Date().getFullYear();
  const [open, setOpen] = React.useState(false);
  const [year, setYear] = React.useState(String(currentYear));
  const [exportingFormat, setExportingFormat] = React.useState<'xlsx' | 'docx' | null>(null);

  const yearOptions = React.useMemo(() => {
    const years: string[] = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push(String(y));
    }
    return years;
  }, [currentYear]);

  const handleExport = async (format: 'xlsx' | 'docx') => {
    setExportingFormat(format);
    try {
      const numericYear = Number(year);
      const response =
        format === 'xlsx'
          ? await laborReportControllerExport({ year: numericYear })
          : await laborReportControllerExportDocx({ year: numericYear });

      const rawData: unknown = response.data;
      if (!(rawData instanceof Blob)) {
        toast.error('Không thể tải tệp báo cáo. Vui lòng thử lại.');
        return;
      }

      const filename =
        format === 'xlsx'
          ? `Mau-01-PLI-Bao-cao-su-dung-lao-dong-${year}.xlsx`
          : `Mau-01-PLI-Bao-cao-su-dung-lao-dong-${year}.docx`;

      triggerBlobDownload(rawData, filename);
      toast.success(
        `Đã xuất Báo cáo sử dụng lao động (Mẫu 01/PLI) năm ${year} định dạng .${format}`
      );
      setOpen(false);
    } catch {
      toast.error('Không thể xuất báo cáo sử dụng lao động. Vui lòng kiểm tra quyền truy cập.');
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type='button' variant='outline' size='sm'>
          <Icons.fileTypeDoc className='mr-1.5 size-4' />
          Báo cáo 01/PLI
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Xuất Báo cáo sử dụng lao động (Mẫu 01/PLI)</DialogTitle>
          <DialogDescription>
            Tổng hợp biến động nhân sự, phân loại hợp đồng lao động, trình độ chuyên môn và bảo hiểm theo chuẩn Nghị định 145/2020/NĐ-CP.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='labor-report-year'>Năm báo cáo</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id='labor-report-year'>
                <SelectValue placeholder='Chọn năm báo cáo' />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    Năm {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className='flex-col sm:flex-row gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => void handleExport('docx')}
            isLoading={exportingFormat === 'docx'}
            disabled={exportingFormat !== null}
          >
            <Icons.fileTypeDoc className='mr-1.5 size-4' />
            Tải bản Word (.docx)
          </Button>
          <Button
            type='button'
            onClick={() => void handleExport('xlsx')}
            isLoading={exportingFormat === 'xlsx'}
            disabled={exportingFormat !== null}
          >
            <Icons.fileTypeXls className='mr-1.5 size-4' />
            Tải bản Excel (.xlsx)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
