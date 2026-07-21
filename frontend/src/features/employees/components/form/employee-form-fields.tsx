"use client";

import * as React from "react";
import { formatDateVN } from "@/lib/date";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Icons } from "@/components/icons";

function formatValue(value: unknown, fallback = "N/A") {
  if (typeof value === "string" && value.trim().length > 0) return value;
  return fallback;
}

function formatDate(value: unknown, fallback = "N/A") {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return formatDateVN(date);
}

export function EditableItem({
  label,
  value,
  editing,
  disabled,
  type,
  error,
  helperText,
  required,
  onChange,
  onBlur,
  statusIcon,
  showSuccessIcon,
}: {
  label: string;
  value: string;
  editing: boolean;
  disabled?: boolean;
  type?: React.ComponentProps<typeof Input>["type"];
  error?: string;
  helperText?: string;
  required?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
  statusIcon?: React.ReactNode;
  showSuccessIcon?: boolean;
}) {
  const inputId = React.useId();

  return (
    <div className="space-y-1.5 rounded-xl border border-border/50 bg-background/70 p-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor={editing ? inputId : undefined}
          className="text-muted-foreground text-[11px] font-medium tracking-wide cursor-pointer"
        >
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </label>
        <div className="flex items-center gap-1.5">
          {statusIcon ? (
            statusIcon
          ) : error && editing ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex size-4 items-center justify-center rounded-full bg-destructive/10">
                  <Icons.close className="size-3 text-destructive" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] break-words">
                {error}
              </TooltipContent>
            </Tooltip>
          ) : !error && editing && showSuccessIcon ? (
            <div className="flex size-4 items-center justify-center rounded-full bg-green-500/10">
              <Icons.check className="size-3 text-green-500" />
            </div>
          ) : null}
        </div>
      </div>
      {editing ? (
        <Input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          error={error}
        />
      ) : (
        <div className="min-h-9 py-2 text-sm font-medium break-words">
          {type === "date" ? formatDate(value) : formatValue(value)}
        </div>
      )}
      {!error && helperText ? (
        <p className="text-muted-foreground text-[0.8rem]">{helperText}</p>
      ) : null}
    </div>
  );
}

export function EditableTextarea({
  label,
  value,
  editing,
  disabled,
  error,
  required,
  showSuccessIcon,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  editing: boolean;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  showSuccessIcon?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  const inputId = React.useId();

  return (
    <div className="space-y-1.5 rounded-xl border border-border/50 bg-background/70 p-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor={editing ? inputId : undefined}
          className="text-muted-foreground text-[11px] font-medium tracking-wide cursor-pointer"
        >
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </label>
        <div className="flex items-center gap-1.5">
          {error && editing ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex size-4 items-center justify-center rounded-full bg-destructive/10">
                  <Icons.close className="size-3 text-destructive" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] break-words">
                {error}
              </TooltipContent>
            </Tooltip>
          ) : !error && editing && showSuccessIcon ? (
            <div className="flex size-4 items-center justify-center rounded-full bg-green-500/10">
              <Icons.check className="size-3 text-green-500" />
            </div>
          ) : null}
        </div>
      </div>
      {editing ? (
        <Textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          error={error}
        />
      ) : (
        <div className="min-h-16 py-2 text-sm font-medium break-words">
          {formatValue(value)}
        </div>
      )}
    </div>
  );
}

export function EditableSelect({
  label,
  value,
  displayValue,
  editing,
  disabled,
  placeholder,
  options,
  error,
  required,
  showSuccessIcon,
  onChange,
  portalContainer,
}: {
  label: string;
  value: string;
  displayValue: string;
  editing: boolean;
  disabled?: boolean;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
  required?: boolean;
  showSuccessIcon?: boolean;
  onChange: (value: string) => void;
  portalContainer?: HTMLElement | null;
}) {
  const selectId = React.useId();

  return (
    <div className="space-y-1.5 rounded-xl border border-border/50 bg-background/70 p-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor={editing ? selectId : undefined}
          className="text-muted-foreground text-[11px] font-medium tracking-wide cursor-pointer"
        >
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </label>
        <div className="flex items-center gap-1.5">
          {error && editing ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex size-4 items-center justify-center rounded-full bg-destructive/10">
                  <Icons.close className="size-3 text-destructive" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] break-words">
                {error}
              </TooltipContent>
            </Tooltip>
          ) : !error && editing && showSuccessIcon ? (
            <div className="flex size-4 items-center justify-center rounded-full bg-green-500/10">
              <Icons.check className="size-3 text-green-500" />
            </div>
          ) : null}
        </div>
      </div>
      {editing ? (
        <div>
          <Select
            value={value}
            onValueChange={onChange}
            disabled={disabled || options.length === 0}
          >
            <SelectTrigger
              id={selectId}
              className={cn(
                "w-full",
                error && "border-destructive focus:ring-destructive",
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent container={portalContainer}>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="min-h-9 py-2 text-sm font-medium break-words">
          {displayValue}
        </div>
      )}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  className,
  id,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-6 rounded-2xl border border-border/60 bg-muted/20 p-5",
        className,
      )}
    >
      {title ? (
        <div className="mb-4 space-y-1">
          <h3 className="text-base font-semibold">{title}</h3>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
