'use client';

import { EmployeeStatusBadge } from '../display/employee-status-badge';
import { EmployeeContractCard } from '../cards/contract/employee-contract-card';
import { EmployeeQualificationsCard } from '../cards/employee-qualifications-card';
import {
  getEmployeeName,
  formatValue,
  formatGender,
  formatDate,
} from '../../utils/employee-display';
import { getSmartStatus } from '../../utils/employee-status';
import { COMPANY_DOCUMENT_OPTIONS } from '../../utils/employee-form-model';
import { employeeUiCopy } from '@/lib/app-copy';
import type { EmployeeResponseDto } from '@/api/generated/model';
import { useQuery } from '@tanstack/react-query';
import { assetIssueControllerHoldings } from '@/api/generated/endpoints';
import { unwrapData } from '@/lib/api-extract';
import { Icons } from '@/components/icons';
import { useEmployeeTimelineQuery } from '../../queries/employee-queries';
import type { TimelineEventDto } from '../../api/timeline';

interface OverviewTabProps {
  employee: EmployeeResponseDto | null;
  isEditing: boolean;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function calculateTenure(startDate: string | null): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return null;
  const now = new Date();
  const years = now.getFullYear() - start.getFullYear();
  const months = now.getMonth() - start.getMonth();
  const totalMonths = years * 12 + months;
  if (totalMonths < 0) return null;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y === 0) return `${m} tháng`;
  if (m === 0) return `${y} năm`;
  return `${y} năm ${m} tháng`;
}

/* ------------------------------------------------------------------ */
/* Card: Employment Summary                                            */
/* ------------------------------------------------------------------ */

function EmploymentSummaryCard({ employee }: { employee: EmployeeResponseDto }) {
  const tenure = calculateTenure(employee.startDate);

  return (
    <div className='rounded-xl border bg-card/60 shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md transition-all duration-300'>
      <div className='flex items-center gap-3 border-b px-4 py-3'>
        <div className='bg-emerald-500/10 p-1.5 rounded-lg text-emerald-600'>
          <Icons.department className='size-4' />
        </div>
        <h3 className='text-sm font-semibold text-foreground/90'>{employeeUiCopy.jobInfo}</h3>
      </div>
      <div className='space-y-3 px-4 py-3 text-sm'>
        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground text-xs'>{employeeUiCopy.positionLabel}</span>
          <span className='font-medium'>{employee.position?.name ?? '—'}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground text-xs'>{employeeUiCopy.departmentLabel}</span>
          <span className='font-medium'>{employee.department?.name ?? '—'}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground text-xs'>{employeeUiCopy.statusLabel}</span>
          <span className='font-medium'>
            <EmployeeStatusBadge status={getSmartStatus(employee).kind} />
          </span>
        </div>
        {employee.employeeCode && (
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-xs'>{employeeUiCopy.employeeCodeShort}</span>
            <span className='font-medium'>{employee.employeeCode}</span>
          </div>
        )}
        {employee.startDate && (
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-xs'>Ngày vào</span>
            <span className='font-medium'>{employee.startDate}</span>
          </div>
        )}
        {tenure && (
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-xs'>Thâm niên</span>
            <span className='font-medium'>{tenure}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card: Records Completeness (formerly Compliance)                    */
/* ------------------------------------------------------------------ */

function RecordsCompletenessCard({ employee }: { employee: EmployeeResponseDto }) {
  const existingDocTypes = new Set(
    (employee.documents ?? []).map((d) => d.documentType),
  );
  const totalRequired = COMPANY_DOCUMENT_OPTIONS.length;
  const completedCount = COMPANY_DOCUMENT_OPTIONS.filter((opt) =>
    existingDocTypes.has(opt.id),
  ).length;
  const completionPct = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0;

  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const expiringCerts = (employee.certifications ?? []).filter((cert) => {
    if (!cert.expiredDate) return false;
    const expDate = new Date(cert.expiredDate);
    if (isNaN(expDate.getTime())) return false;
    return expDate <= in90Days && expDate >= now;
  });

  return (
    <div className='rounded-xl border bg-card/60 shadow-sm border-l-4 border-l-teal-500 hover:shadow-md transition-all duration-300'>
      <div className='flex items-center gap-3 border-b px-4 py-3'>
        <div className='bg-teal-500/10 p-1.5 rounded-lg text-teal-600'>
          <Icons.forms className='size-4' />
        </div>
        <h3 className='text-sm font-semibold text-foreground/90'>Hồ sơ giấy tờ</h3>
      </div>
      <div className='space-y-3 px-4 py-3 text-sm'>
        {/* Document completion bar */}
        <div>
          <div className='mb-1 flex items-center justify-between'>
            <span className='text-muted-foreground text-xs'>Hồ sơ giấy tờ</span>
            <span className='text-xs font-medium'>{completedCount}/{totalRequired}</span>
          </div>
          <div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
            <div
              className='h-full rounded-full bg-emerald-500 transition-all'
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>

        {/* Expiring certifications */}
        {expiringCerts.length > 0 && (
          <div>
            <span className='text-muted-foreground text-xs'>Chứng chỉ sắp hết hạn</span>
            <div className='mt-1 space-y-1'>
              {expiringCerts.slice(0, 3).map((cert) => {
                const daysLeft = Math.ceil(
                  (new Date(cert.expiredDate!).getTime() - now.getTime()) /
                    (24 * 60 * 60 * 1000),
                );
                return (
                  <div key={cert.id} className='flex items-center gap-1.5 text-xs text-amber-600'>
                    <Icons.warning className='size-3 shrink-0' />
                    <span className='truncate'>{cert.name}</span>
                    <span className='shrink-0'>({daysLeft} ngày)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {completedCount === totalRequired && expiringCerts.length === 0 && (
          <p className='flex items-center gap-1.5 text-xs text-emerald-600'>
            <Icons.circleCheck className='size-3.5' />
            Đầy đủ
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card: Assets Summary                                                */
/* ------------------------------------------------------------------ */

function AssetsSummaryCard({ employee }: { employee: EmployeeResponseDto }) {
  const { data } = useQuery({
    queryKey: ['asset-holdings', employee.id],
    queryFn: () => assetIssueControllerHoldings(employee.id),
  });
  const result = unwrapData<{ employeeId: string; holdings: any[] }>(data);
  const handovers = result?.holdings ?? [];
  const recentItems = handovers.slice(0, 3);

  return (
    <div className='rounded-xl border bg-card/60 shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition-all duration-300'>
      <div className='flex items-center gap-3 border-b px-4 py-3'>
        <div className='bg-amber-500/10 p-1.5 rounded-lg text-amber-600'>
          <Icons.product className='size-4' />
        </div>
        <h3 className='text-sm font-semibold text-foreground/90'>{employeeUiCopy.handedOverAssets}</h3>
      </div>
      <div className='px-4 py-3 text-sm'>
        {handovers.length > 0 ? (
          <>
            <p className='mb-2 text-xs text-muted-foreground'>
              Tổng số: <span className='font-medium text-foreground'>{handovers.length}</span> tài sản
            </p>
            {recentItems.length > 0 && (
              <div className='space-y-1.5'>
                {recentItems.map((item: any, idx: number) => {
                  return (
                    <div key={item.assetId ?? idx} className='flex items-center gap-2 text-xs'>
                      <Icons.checks className='size-3 shrink-0 text-muted-foreground' />
                      <span className='truncate'>{item.assetTypeName ?? '—'}</span>
                      {item.serialNumber && (
                        <span className='shrink-0 text-muted-foreground'>
                          S/N: {item.serialNumber}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className='text-xs text-muted-foreground'>{employeeUiCopy.noHandedOverAssets}</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card: Recent Activity (connected — uses useEmployeeTimelineQuery) */
/* ------------------------------------------------------------------ */

const RECENT_ACTIVITY_LIMIT = 5;

const ACTIVITY_TYPE_ICONS: Record<string, keyof typeof Icons> = {
  system: 'shieldCheck',
  status: 'refresh',
  contract: 'page',
  position: 'department',
};

function getActivityLabel(event: TimelineEventDto): string {
  switch (event.event) {
    case 'employee_created':
      return 'Tạo hồ sơ nhân viên';
    case 'status_changed':
      return 'Thay đổi trạng thái';
    case 'contract_created':
      return 'Tạo hợp đồng';
    case 'contract_renewed':
      return 'Gia hạn hợp đồng';
    case 'contract_amended':
      return 'Sửa đổi hợp đồng';
    case 'contract_ended':
      return 'Kết thúc hợp đồng';
    case 'contract_expired':
      return 'Hợp đồng hết hạn';
    case 'assignment_created':
      return 'Bổ nhiệm vị trí';
    case 'position_changed':
      return 'Thay đổi vị trí';
    default:
      return event.event;
  }
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function RecentActivityCard({ employee }: { employee: EmployeeResponseDto }) {
  const { data: events, isLoading, error } = useEmployeeTimelineQuery(employee.id, {
    limit: RECENT_ACTIVITY_LIMIT,
  });

  return (
    <div className='rounded-xl border bg-card/60 shadow-sm border-l-4 border-l-indigo-500 hover:shadow-md transition-all duration-300'>
      <div className='flex items-center gap-3 border-b px-4 py-3'>
        <div className='bg-indigo-500/10 p-1.5 rounded-lg text-indigo-600'>
          <Icons.activity className='size-4' />
        </div>
        <h3 className='text-sm font-semibold text-foreground/90'>Hoạt động gần đây</h3>
      </div>
      <div className='px-4 py-3 text-sm'>
        {/* Loading */}
        {isLoading && (
          <div className='flex items-center justify-center py-4'>
            <Icons.spinner className='size-4 animate-spin text-muted-foreground' />
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <p className='py-4 text-center text-xs text-muted-foreground'>
            Không thể tải hoạt động gần đây
          </p>
        )}

        {/* Empty */}
        {!isLoading && !error && (!events || events.length === 0) && (
          <p className='py-4 text-center text-xs text-muted-foreground'>
            Chưa có hoạt động nào
          </p>
        )}

        {/* Events list */}
        {events && events.length > 0 && !isLoading && !error && (
          <div className='space-y-2'>
            {events.map((event) => {
              const Icon = Icons[ACTIVITY_TYPE_ICONS[event.type] ?? 'activity'];
              return (
                <div key={event.id} className='flex items-start gap-2.5'>
                  <Icon className='mt-0.5 size-3.5 shrink-0 text-muted-foreground' />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-xs font-medium leading-snug'>
                      {getActivityLabel(event)}
                    </p>
                    <p className='text-muted-foreground text-[10px] leading-snug'>
                      {formatShortDate(event.occurredAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section: Personal Information                                       */
/* ------------------------------------------------------------------ */

function PersonalInfoSection({ employee }: { employee: EmployeeResponseDto }) {
  const infoRows: Array<{ label: string; value: string }> = [
    { label: employeeUiCopy.fields.email, value: employee.email ?? '' },
    { label: employeeUiCopy.phoneLabelShort, value: employee.phoneNumber ?? '' },
    { label: employeeUiCopy.fields.gender, value: formatGender(employee.gender) },
    { label: employeeUiCopy.fields.dob, value: formatDate(employee.dob) },
    { label: employeeUiCopy.fields.address, value: typeof employee.address === 'string' ? employee.address : '' },
    { label: employeeUiCopy.identityLabelShort, value: employee.identityNumber ?? '' },
    { label: employeeUiCopy.fields.identityDate, value: formatDate(employee.identityDate) },
    { label: employeeUiCopy.fields.identityPlace, value: employee.identityPlace ?? '' },
    { label: employeeUiCopy.bankLabel, value: [employee.bankName, employee.bankAccountNumber].filter(Boolean).join(' - ') },
    { label: employeeUiCopy.taxCodeLabel, value: employee.taxCode ?? '' },
    { label: employeeUiCopy.emergencyContactLabel, value: [employee.emergencyContactName, employee.emergencyContactPhone].filter(Boolean).join(' - ') },
  ].filter((r) => r.value);

  if (infoRows.length === 0) return null;

  return (
    <div className='rounded-xl border bg-card/60 shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-all duration-300'>
      <div className='flex items-center gap-3 border-b px-4 py-3'>
        <div className='bg-blue-500/10 p-1.5 rounded-lg text-blue-600'>
          <Icons.user className='size-4' />
        </div>
        <h3 className='flex-1 text-sm font-semibold text-foreground/90'>{employeeUiCopy.personalInfoTitle}</h3>
      </div>
      <div className='grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3 text-sm lg:grid-cols-3'>
        {infoRows.map((row) => (
          <div key={row.label}>
            <span className='text-muted-foreground text-xs'>{row.label}</span>
            <p className='mt-0.5'>{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview Tab — Dashboard Layout                                     */
/* ------------------------------------------------------------------ */

export function OverviewTab({ employee, isEditing }: OverviewTabProps) {
  if (!employee) return null;

  return (
    <div className='space-y-4'>
      {/* Row 1: Personal Info + Employment Summary */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <PersonalInfoSection employee={employee} />
        <EmploymentSummaryCard employee={employee} />
      </div>

      {/* Row 2: Contract Summary */}
      <EmployeeContractCard employeeId={employee.id} />

      {/* Row 3: Records Completeness + Assets Summary */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <RecordsCompletenessCard employee={employee} />
        <AssetsSummaryCard employee={employee} />
      </div>

      {/* Row 4: Qualifications */}
      <EmployeeQualificationsCard employeeId={employee.id} />

      {/* Row 5: Recent Activity */}
      <RecentActivityCard employee={employee} />
    </div>
  );
}
