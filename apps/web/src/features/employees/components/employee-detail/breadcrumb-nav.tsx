'use client';

import Link from 'next/link';
import { Icons } from '@/components/icons';
import type { EmployeeResponseDto } from '@/api/generated/model';

function getEmployeeName(employee: EmployeeResponseDto) {
  return employee.lastName && employee.firstName
    ? `${employee.lastName} ${employee.firstName}`.trim()
    : employee.username;
}

interface BreadcrumbNavProps {
  employee: EmployeeResponseDto;
}

export function BreadcrumbNav({ employee }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link href="/employees" className="hover:text-foreground transition-colors">
        Nhân viên
      </Link>
      <Icons.chevronRight className="h-3.5 w-3.5" />
      <span className="text-foreground font-medium truncate max-w-[240px]">
        {getEmployeeName(employee)}
      </span>
    </nav>
  );
}
