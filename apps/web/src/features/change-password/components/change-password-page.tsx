'use client';

import * as z from 'zod';
import { useState, useMemo, useCallback } from 'react';
import { changePasswordUiCopy } from '@/lib/app-copy';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppForm } from '@/components/ui/tanstack-form';
import { validationCopy } from '@/lib/feedback-copy';
import { useChangePasswordMutation } from '../queries/change-password-mutation';
import { cn } from '@/lib/utils';

// ─── Password strength ────────────────────────────────────────────────
type Strength = 'empty' | 'weak' | 'fair' | 'strong' | 'very-strong';

function computeStrength(password: string): Strength {
  if (!password) return 'empty';
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 1) return 'weak';
  if (score === 2) return 'fair';
  if (score <= 3) return 'strong';
  return 'very-strong';
}

const strengthLabel: Record<Strength, string> = {
  empty: '',
  weak: 'Yếu',
  fair: 'Trung bình',
  strong: 'Mạnh',
  'very-strong': 'Rất mạnh',
};

// ─── Password requirement checks ───────────────────────────────────────
interface Requirements {
  min10: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  notCurrent: boolean;
}

function checkRequirements(pw: string, currentPw: string): Requirements {
  return {
    min10: pw.length >= 10,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    special: /[^a-zA-Z0-9]/.test(pw),
    notCurrent: pw.length > 0 && pw !== currentPw,
  };
}

const requirementLabels: { key: keyof Requirements; label: string }[] = [
  { key: 'min10', label: 'Ít nhất 10 ký tự' },
  { key: 'uppercase', label: 'Chữ hoa (A-Z)' },
  { key: 'lowercase', label: 'Chữ thường (a-z)' },
  { key: 'number', label: 'Số (0-9)' },
  { key: 'special', label: 'Ký tự đặc biệt (!@#$...)' },
  { key: 'notCurrent', label: 'Khác mật khẩu hiện tại' },
];

const STRENGTH_SEGMENTS = ['weak', 'fair', 'strong', 'very-strong'] as const;

// ─── Schema ────────────────────────────────────────────────────────────
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: validationCopy.changePassword.currentRequired }),
    newPassword: z.string().min(10, { message: validationCopy.changePassword.newMin10 }),
    confirmPassword: z.string().min(10, { message: validationCopy.changePassword.confirmRequired }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: validationCopy.changePassword.confirmMismatch,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    message: validationCopy.changePassword.mustDiffer,
  });

// ─── Show/hide toggle ─────────────────────────────────────────────────
function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
      tabIndex={-1}
    >
      {shown ? <Icons.eyeOff className="size-4" /> : <Icons.eye className="size-4" />}
    </button>
  );
}

// ─── Segmented strength meter ──────────────────────────────────────────
function StrengthMeter({ strength }: { strength: Strength }) {
  if (strength === 'empty') return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex h-1.5 w-full gap-1">
        {STRENGTH_SEGMENTS.map((level) => (
          <div
            key={level}
            className={cn(
              'h-full flex-1 rounded-full transition-colors duration-300',
              level === 'weak' && (strength === 'weak' || strength === 'fair' || strength === 'strong' || strength === 'very-strong') && 'bg-red-500',
              level === 'fair' && (strength === 'fair' || strength === 'strong' || strength === 'very-strong') && 'bg-orange-500',
              level === 'strong' && (strength === 'strong' || strength === 'very-strong') && 'bg-yellow-500',
              level === 'very-strong' && strength === 'very-strong' && 'bg-emerald-500',
              !(level === 'weak' && (strength === 'weak' || strength === 'fair' || strength === 'strong' || strength === 'very-strong')) &&
                !(level === 'fair' && (strength === 'fair' || strength === 'strong' || strength === 'very-strong')) &&
                !(level === 'strong' && (strength === 'strong' || strength === 'very-strong')) &&
                !(level === 'very-strong' && strength === 'very-strong') &&
                'bg-muted-foreground/10',
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          'text-xs font-medium',
          strength === 'weak' && 'text-red-500',
          strength === 'fair' && 'text-orange-500',
          strength === 'strong' && 'text-yellow-600 dark:text-yellow-400',
          strength === 'very-strong' && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {strengthLabel[strength]}
      </p>
    </div>
  );
}

// ─── Requirement checklist ─────────────────────────────────────────────
function RequirementChecklist({ current, new: newPw }: { current: string; new: string }) {
  const reqs = useMemo(() => checkRequirements(newPw, current), [newPw, current]);
  return (
    <ul className="space-y-2.5">
      {requirementLabels.map(({ key, label }) => {
        const met = reqs[key];
        return (
          <li
            key={key}
            className={cn(
              'flex items-start gap-2 text-xs leading-5 transition-colors duration-200',
              newPw.length === 0
                ? 'text-muted-foreground/60'
                : met
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground',
            )}
          >
            {newPw.length === 0 ? (
              <Icons.circle className="mt-0.5 size-3.5 shrink-0" />
            ) : met ? (
              <Icons.circleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
            ) : (
              <Icons.circleX className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
            )}
            {label}
          </li>
        );
      })}
    </ul>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function ChangePasswordPage() {
  const changePasswordMutation = useChangePasswordMutation();
  const [showFields, setShowFields] = useState({ current: false, new: false, confirm: false });
  const [success, setSuccess] = useState(false);
  // Track password values for real-time strength/requirement feedback
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const toggleField = useCallback((field: 'current' | 'new' | 'confirm') => {
    setShowFields((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const strength = useMemo(() => computeStrength(newPw), [newPw]);
  const allRequirementsMet = useMemo(() => {
    const r = checkRequirements(newPw, currentPw);
    return r.min10 && r.uppercase && r.lowercase && r.number && r.special && r.notCurrent;
  }, [newPw, currentPw]);
  const canSubmit =
    allRequirementsMet && confirmPw.length >= 10 && !changePasswordMutation.isPending;

  const form = useAppForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    validators: { onSubmit: changePasswordSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        await changePasswordMutation.mutateAsync({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        });
        formApi.reset();
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        setShowFields({ current: false, new: false, confirm: false });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        // ponytail: auto-dismiss success banner after 3s; extend if UX requires
      } catch {
        // onError handles toast
      }
    },
  });

  const handleClear = useCallback(() => {
    form.reset();
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setShowFields({ current: false, new: false, confirm: false });
  }, [form]);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_340px]">
      {/* ── Form card ── */}
      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="space-y-1 border-b border-border px-6 py-5">
          <h2 className="text-lg font-semibold tracking-tight">{changePasswordUiCopy.title}</h2>
          <p className="text-muted-foreground text-sm">{changePasswordUiCopy.description}</p>
        </div>

        {success && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            <Icons.circleCheck className="size-4 shrink-0" />
            <span>{changePasswordUiCopy.successMessage}</span>
          </div>
        )}

        <div className="px-6 py-6">
          <form.AppForm>
            <form.Form className="space-y-6 p-0">
              {/* Current password */}
              <form.AppField
                name="currentPassword"
                children={(field) => (
                  <field.FieldSet>
                    <field.FieldLabel htmlFor={field.name}>
                      {changePasswordUiCopy.currentPasswordLabel}
                    </field.FieldLabel>
                    <div className="relative">
                      <Input
                        id={field.name}
                        type={showFields.current ? 'text' : 'password'}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          field.handleChange(e.target.value);
                          setCurrentPw(e.target.value);
                        }}
                        placeholder={changePasswordUiCopy.currentPasswordPlaceholder}
                        disabled={changePasswordMutation.isPending}
                        aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                        className="h-11 pe-10"
                      />
                      <PasswordToggle
                        shown={showFields.current}
                        onToggle={() => toggleField('current')}
                      />
                    </div>
                    <field.FieldError />
                  </field.FieldSet>
                )}
              />

              {/* New password */}
              <form.AppField
                name="newPassword"
                children={(field) => (
                  <field.FieldSet>
                    <field.FieldLabel htmlFor={field.name}>
                      {changePasswordUiCopy.newPasswordLabel}
                    </field.FieldLabel>
                    <div className="relative">
                      <Input
                        id={field.name}
                        type={showFields.new ? 'text' : 'password'}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          field.handleChange(e.target.value);
                          setNewPw(e.target.value);
                        }}
                        placeholder={changePasswordUiCopy.newPasswordPlaceholder}
                        disabled={changePasswordMutation.isPending}
                        aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                        className="h-11 pe-10"
                      />
                      <PasswordToggle
                        shown={showFields.new}
                        onToggle={() => toggleField('new')}
                      />
                    </div>
                    <StrengthMeter strength={strength} />
                    <field.FieldError />
                  </field.FieldSet>
                )}
              />

              {/* Confirm password */}
              <form.AppField
                name="confirmPassword"
                children={(field) => (
                  <field.FieldSet>
                    <field.FieldLabel htmlFor={field.name}>
                      {changePasswordUiCopy.confirmPasswordLabel}
                    </field.FieldLabel>
                    <div className="relative">
                      <Input
                        id={field.name}
                        type={showFields.confirm ? 'text' : 'password'}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          field.handleChange(e.target.value);
                          setConfirmPw(e.target.value);
                        }}
                        placeholder={changePasswordUiCopy.confirmPasswordPlaceholder}
                        disabled={changePasswordMutation.isPending}
                        aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                        className="h-11 pe-10"
                      />
                      <PasswordToggle
                        shown={showFields.confirm}
                        onToggle={() => toggleField('confirm')}
                      />
                    </div>
                    <field.FieldError />
                  </field.FieldSet>
                )}
              />

              <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={changePasswordMutation.isPending}
                  onClick={handleClear}
                  className="text-muted-foreground h-9 px-0 hover:text-foreground"
                >
                  <Icons.close className="mr-1.5 size-4" />
                  {changePasswordUiCopy.clearAction}
                </Button>
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  isLoading={changePasswordMutation.isPending}
                  className="min-w-40 h-11"
                >
                  {changePasswordUiCopy.submitAction}
                </Button>
              </div>
            </form.Form>
          </form.AppForm>
        </div>
      </section>

      {/* ── Requirements sidebar ── */}
      <aside className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <Icons.shield className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{changePasswordUiCopy.securityTitle}</h3>
              <p className="text-muted-foreground text-xs">
                {changePasswordUiCopy.securityDescription}
              </p>
            </div>
          </div>
          <RequirementChecklist current={currentPw} new={newPw} />
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {changePasswordUiCopy.tipsTitle}
          </h4>
          <ul className="space-y-2">
            {changePasswordUiCopy.tips.map((tip) => (
              <li
                key={tip}
                className="text-muted-foreground flex items-start gap-2 text-xs leading-5"
              >
                <span className="mt-0.5 block size-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}