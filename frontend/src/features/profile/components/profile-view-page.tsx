"use client";

import * as React from "react";
import { formatDateVN } from "@/lib/date";
import {
  isEmployeeProfileMissingError,
  useMyEmployeeProfileQuery,
  useMyUserProfileQuery,
} from "../queries/profile-queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { commonUiCopy, employeeUiCopy, profileUiCopy, userUiCopy } from "@/lib/app-copy";
import { extractProtectedAssetUrl, toProtectedAssetUrl } from "@/lib/asset-url";
import { cn } from "@/lib/utils";
import type { EmployeeResponseDto, UserResponseDto } from "@/api/generated/model";
import Link from "next/link";

function getEmployeeName(employee: EmployeeResponseDto) {
  const fullName = [employee.lastName, employee.firstName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || employee.username;
}

function getTextString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const candidate = Object.values(value).find(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
    if (candidate) return candidate;
  }
  return fallback;
}

function formatValue(value: unknown, fallback: string = commonUiCopy.notAvailable) {
  const text = getTextString(value);
  return text.trim().length > 0 ? text : fallback;
}

function formatGender(value: unknown) {
  if (value === "male") return profileUiCopy.genderLabels.male;
  if (value === "female") return profileUiCopy.genderLabels.female;
  if (value === "other") return profileUiCopy.genderLabels.other;
  return formatValue(value);
}

function formatAddress(value: unknown, fallback: string = commonUiCopy.notAvailable) {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (!value || typeof value !== "object") return fallback;
  const parts = Object.values(value).filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(", ") : fallback;
}

function formatDate(value: unknown, fallback: string = commonUiCopy.notAvailable) {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return formatDateVN(date);
}

function getInitials(employee: EmployeeResponseDto) {
  const initials = [employee.lastName, employee.firstName]
    .filter(Boolean)
    .map((p) => p.trim().charAt(0).toUpperCase())
    .join("");
  return initials || employee.username.slice(0, 2).toUpperCase();
}

function getDocumentTypeLabel(value: unknown) {
  if (typeof value !== "string") return "";

  switch (value) {
    case "resume":
      return profileUiCopy.documentTypeLabels.resume;
    case "jobApplication":
      return profileUiCopy.documentTypeLabels.jobApplication;
    case "healthCert":
      return profileUiCopy.documentTypeLabels.healthCert;
    case "recruitmentDecision":
      return profileUiCopy.documentTypeLabels.recruitmentDecision;
    case "jobDescription":
      return profileUiCopy.documentTypeLabels.jobDescription;
    case "householdRegistration":
      return profileUiCopy.documentTypeLabels.householdRegistration;
    case "identityCardDoc":
      return profileUiCopy.documentTypeLabels.identityCardDoc;
    case "residenceConfirmation":
      return profileUiCopy.documentTypeLabels.residenceConfirmation;
    default:
      return value;
  }
}

function getDocumentLabel(document: unknown) {
  if (!document || typeof document !== "object") return "";

  const legacyName = (document as { name?: unknown }).name;
  if (typeof legacyName === "string" && legacyName.trim().length > 0) return legacyName;

  return getDocumentTypeLabel((document as { documentType?: unknown }).documentType);
}

function getAttachmentUrl(value: unknown) {
  return extractProtectedAssetUrl(value) ?? "";
}

function getDocumentUrl(document: unknown) {
  if (!document || typeof document !== "object") return "";

  const legacyUrl = (document as { url?: unknown }).url;
  if (typeof legacyUrl === "string" && legacyUrl.trim().length > 0) return legacyUrl;

  return getAttachmentUrl((document as { attachment?: unknown }).attachment);
}

function getCertificationUrl(certification: unknown) {
  if (!certification || typeof certification !== "object") return "";

  const legacyImage = (certification as { image?: unknown }).image;
  if (typeof legacyImage === "string" && legacyImage.trim().length > 0) return legacyImage;

  return getAttachmentUrl((certification as { attachment?: unknown }).attachment);
}

function getUserInitials(user: UserResponseDto) {
  return user.username.slice(0, 2).toUpperCase();
}

function DisplayItem({
  label,
  value,
  type,
}: {
  label: string;
  value: string;
  type?: "text" | "date";
}) {
  return (
    <div className="space-y-1.5 rounded-xl border border-border/50 bg-background/70 p-3">
      <div className="text-muted-foreground text-[11px] font-medium tracking-wide">
        {label}
      </div>
      <div className="min-h-9 py-2 text-sm font-medium break-words">
        {type === "date" ? formatDate(value) : formatValue(value)}
      </div>
    </div>
  );
}

function DisplayTextarea({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1.5 rounded-xl border border-border/50 bg-background/70 p-3">
      <div className="text-muted-foreground text-[11px] font-medium tracking-wide">
        {label}
      </div>
      <div className="min-h-16 py-2 text-sm font-medium break-words">
        {formatValue(value)}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-muted/20 p-5",
        className,
      )}
    >
      <div className="mb-4 space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function ProfileViewPage() {
  const {
    data: employee,
    isLoading: isEmployeeLoading,
    error: employeeError,
  } = useMyEmployeeProfileQuery();
  const {
    data: user,
    isLoading: isUserLoading,
    error: userError,
  } = useMyUserProfileQuery();


  const missingEmployeeProfile = isEmployeeProfileMissingError(employeeError);

  if (isEmployeeLoading || isUserLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Icons.spinner className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userError || (!employee && !user) || (employeeError && !missingEmployeeProfile)) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <p className="text-muted-foreground">{profileUiCopy.loadFailed}</p>
      </div>
    );
  }

  if (!employee && user) {
    const avatarUrl = extractProtectedAssetUrl(user.avatar);

    return (
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <Card className="border-border/60 bg-muted/20 shadow-none">
            <CardHeader className="space-y-2">
              <CardTitle>{profileUiCopy.accountInfoTitle}</CardTitle>
              <CardDescription>
                {profileUiCopy.accountInfoDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Icons.info className="size-4" />
                <AlertTitle>{profileUiCopy.noEmployeeProfileTitle}</AlertTitle>
                <AlertDescription>
                  {profileUiCopy.noEmployeeProfileDescription}
                </AlertDescription>
              </Alert>

              <div className="flex justify-center pb-2">
                <div className="relative">
                  <Avatar className="h-60 w-60 border-4 border-background shadow-sm">
                    <AvatarImage
                      src={avatarUrl}
                      alt={user.username}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-muted text-4xl font-semibold">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DisplayItem label={commonUiCopy.username} value={user.username} />
                <DisplayItem label={userUiCopy.emailLabel} value={user.email ?? ""} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DisplayItem
                  label={profileUiCopy.accountTypeLabel}
                  value={user.isSuperAdmin ? profileUiCopy.superAdmin : profileUiCopy.standardUser}
                />
                <DisplayItem
                  label={profileUiCopy.employeeLinkLabel}
                  value={profileUiCopy.notLinked}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Section
            title={profileUiCopy.accountAccessTitle}
            description={profileUiCopy.accountAccessDescription}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/70 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{profileUiCopy.adminRoleTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {profileUiCopy.adminRoleDescription}
                  </p>
                </div>
                {user.isSuperAdmin ? (
                  <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">{profileUiCopy.superAdmin}</Badge>
                ) : (
                  <Badge variant="secondary">{profileUiCopy.standardUser}</Badge>
                )}
              </div>

              <div className="rounded-xl border border-border/50 bg-background/70 p-4">
                <p className="text-sm font-medium leading-none mb-3">{profileUiCopy.permissionsTitle}</p>
                {user.permissions && user.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.permissions.map((perm) => (
                      <Badge key={perm} variant="outline" className="text-xs font-normal">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {user.isSuperAdmin
                      ? profileUiCopy.superAdminNoExtraPermissions
                      : profileUiCopy.noSpecificPermissions}
                  </p>
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <p className="text-muted-foreground">{profileUiCopy.loadFailed}</p>
      </div>
    );
  }

  const avatarUrl = extractProtectedAssetUrl(employee.avatar || user?.avatar);

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-8 xl:col-span-2">
        <div className="flex items-center justify-between">
          <div />
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link href={`/employees/${employee.id}`}>
              <Icons.profile className="mr-1.5 size-4" />
              {employeeUiCopy.table.viewDetails}
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <Section
              title={profileUiCopy.personalInfoTitle}
              description={profileUiCopy.personalInfoDescription}
            >
              <div className="space-y-4">
                <div className="flex justify-center pb-2">
                  <div className="relative">
                    <Avatar className="h-60 w-60 border-4 border-background shadow-sm">
                      <AvatarImage
                        src={avatarUrl}
                        alt={getEmployeeName(employee)}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-muted text-4xl font-semibold">
                        {getInitials(employee)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DisplayItem
                    label={employeeUiCopy.fields.lastName}
                    value={employee.lastName ?? ""}
                  />
                  <DisplayItem
                    label={employeeUiCopy.fields.firstName}
                    value={employee.firstName ?? ""}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DisplayItem
                    label={employeeUiCopy.fields.dob}
                    value={employee.dob ?? ""}
                    type="date"
                  />
                  <DisplayItem
                    label={employeeUiCopy.fields.gender}
                    value={formatGender(employee.gender)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DisplayItem
                    label={employeeUiCopy.fields.identityNumber}
                    value={employee.identityNumber ?? ""}
                  />
                  <DisplayItem
                    label={employeeUiCopy.fields.identityDate}
                    value={employee.identityDate ?? ""}
                    type="date"
                  />
                </div>
                <DisplayItem
                  label={employeeUiCopy.fields.identityPlace}
                  value={employee.identityPlace ?? ""}
                />
              </div>
            </Section>
          </div>

          <div className="space-y-8">
            <Section
              title={profileUiCopy.workInfoTitle}
              description={profileUiCopy.workInfoDescription}
            >
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <DisplayItem
                    label={employeeUiCopy.departmentLabel}
                    value={formatValue(employee.department?.name)}
                  />
                  <DisplayItem
                    label={employeeUiCopy.positionLabel}
                    value={formatValue(employee.position?.name)}
                  />
                </div>
                <DisplayItem
                  label={employeeUiCopy.labels.employeeCode}
                  value={employee.employeeCode ?? ""}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <DisplayItem
                    label={employeeUiCopy.labels.startDate}
                    value={employee.startDate ?? ""}
                    type="date"
                  />
                  <DisplayItem
                    label={employeeUiCopy.labels.endDate}
                    value={employee.endDate ?? ""}
                    type="date"
                  />
                </div>
              </div>
            </Section>

            <Section
              title={profileUiCopy.contactInfoTitle}
              description={profileUiCopy.contactInfoDescription}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <DisplayItem
                  label={userUiCopy.emailLabel}
                  value={employee.email ?? ""}
                />
                <DisplayItem
                  label={employeeUiCopy.fields.phoneNumber}
                  value={employee.phoneNumber ?? ""}
                />
              </div>
              <div className="pt-4">
                <DisplayTextarea
                  label={employeeUiCopy.fields.address}
                  value={typeof employee.address === "string" ? employee.address : formatAddress(employee.address, "")}
                />
              </div>
            </Section>
          </div>
        </div>

        <Section
          title={profileUiCopy.companyRecordsTitle}
          description={profileUiCopy.companyRecordsDescription}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {employee.documents && employee.documents.length > 0 ? (
              employee.documents.map((document) => (
                <div
                  key={document.id}
                  className="rounded-2xl border border-border/60 bg-background/80 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="text-sm font-medium leading-none">
                        {getDocumentLabel(document)}
                      </div>
                      {getDocumentUrl(document) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground truncate text-xs">
                            {profileUiCopy.attachedLabel}
                          </span>
                          <a
                            href={toProtectedAssetUrl(getDocumentUrl(document))}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline text-xs font-medium"
                          >
                            {commonUiCopy.view}
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground rounded-2xl border border-dashed p-6 text-sm col-span-full text-center">
                {profileUiCopy.noDocuments}
              </div>
            )}
          </div>
        </Section>
      </div>

      <div className="space-y-8">
        {user && (
          <Section
            title={profileUiCopy.accountAccessTitle}
            description={profileUiCopy.accountAccessDescription}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/70 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{profileUiCopy.adminRoleTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {profileUiCopy.adminRoleDescription}
                  </p>
                </div>
                {user.isSuperAdmin ? (
                  <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">{profileUiCopy.superAdmin}</Badge>
                ) : (
                  <Badge variant="secondary">{profileUiCopy.standardUser}</Badge>
                )}
              </div>
              
              <div className="rounded-xl border border-border/50 bg-background/70 p-4">
                <p className="text-sm font-medium leading-none mb-3">{profileUiCopy.permissionsTitle}</p>
                {user.permissions && user.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.permissions.map((perm) => (
                      <Badge key={perm} variant="outline" className="text-xs font-normal">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {user.isSuperAdmin
                      ? profileUiCopy.superAdminNoExtraPermissions
                      : profileUiCopy.noSpecificPermissions}
                  </p>
                )}
              </div>
            </div>
          </Section>
        )}

        <Section
          title={employeeUiCopy.certificationsSection.title}
          description={profileUiCopy.certificationsDescription}
        >
          <div className="space-y-3">
            {employee.certifications && employee.certifications.length > 0 ? (
              employee.certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="rounded-2xl border border-border/60 bg-background/80 p-4"
                >
                  <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
                    <div className="text-sm font-semibold">
                      {employeeUiCopy.certificationsSection.itemTitle}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <DisplayItem
                      label={employeeUiCopy.certificationsSection.name}
                      value={cert.name ?? ""}
                    />
                    <DisplayItem
                      label={employeeUiCopy.certificationsSection.issuer}
                      value={cert.issuedBy ?? ""}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DisplayItem
                        label={employeeUiCopy.certificationsSection.issuedDate}
                        value={cert.issuedDate ?? ""}
                        type="date"
                      />
                      <DisplayItem
                        label={employeeUiCopy.certificationsSection.expiredDate}
                        value={cert.expiredDate ?? ""}
                        type="date"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex min-h-8 flex-wrap gap-2">
                    {getCertificationUrl(cert) ? (
                      <a
                        href={toProtectedAssetUrl(getCertificationUrl(cert))}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-sm font-medium hover:underline inline-flex items-center h-9 px-3 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                      >
                        {profileUiCopy.viewFile}
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground rounded-2xl border border-dashed p-6 text-sm text-center">
                {profileUiCopy.noCertifications}
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
