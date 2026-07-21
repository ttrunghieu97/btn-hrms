'use client';

import * as React from 'react';
import { COMPANY_DOCUMENT_OPTIONS } from '../../utils/employee-form-model';
import type { EmployeeResponseDto, EmployeeCertificationDto } from '@/api/generated/model';

interface AttentionCenterProps {
  employee: EmployeeResponseDto | null;
}

export function AttentionCenter({ employee }: AttentionCenterProps) {
  const items = React.useMemo(() => {
    const result: Array<{ type: 'missing' | 'expiring' | 'pending'; label: string }> = [];

    if (!employee) return result;

    // 1. Missing documents — compare COMPANY_DOCUMENT_OPTIONS with existing docs
    const existingDocTypes = new Set(
      (employee.documents ?? []).map((d) => d.documentType),
    );
    const missingDocs = COMPANY_DOCUMENT_OPTIONS.filter(
      (opt) => !existingDocTypes.has(opt.id),
    );
    for (const doc of missingDocs) {
      result.push({ type: 'missing', label: `Thiếu: ${doc.label}` });
    }

    // 2. Expiring certifications — check if any cert expires within 90 days
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    for (const cert of employee.certifications ?? []) {
      if (!cert.expiredDate) continue;
      const expDate = new Date(cert.expiredDate);
      if (isNaN(expDate.getTime())) continue;
      if (expDate <= in90Days && expDate >= now) {
        const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        result.push({ type: 'expiring', label: `${cert.name} hết hạn trong ${daysLeft} ngày` });
      }
    }

    return result;
  }, [employee]);

  if (items.length === 0) return null;

  return (
    <div className='rounded-lg border-2 border-amber-300/50 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/30'>
      <div className='border-b border-amber-200/50 px-4 py-2.5 dark:border-amber-800/50'>
        <h3 className='text-xs font-semibold text-amber-800 dark:text-amber-300'>
          Cần xử lý
        </h3>
      </div>
      <div className='grid grid-cols-3 gap-2 px-4 py-3'>
        {items.map((item, idx) => (
          <div key={idx} className='flex items-center gap-2 text-xs'>
            <span className={
              item.type === 'missing' ? 'text-rose-600 dark:text-rose-400' :
              item.type === 'expiring' ? 'text-amber-600 dark:text-amber-400' :
              'text-sky-600 dark:text-sky-400'
            }>
              {item.type === 'missing' ? '●' : item.type === 'expiring' ? '◷' : '○'}
            </span>
            <span className='text-foreground/80'>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
