import { cn } from '@/lib/utils';

interface MoneyCellProps {
  amount: string | number;
  currency?: string;
  locale?: string;
  className?: string;
  align?: 'left' | 'right';
}

const currencySymbols: Record<string, string> = {
  VND: '₫',
  USD: '$',
  EUR: '€',
};

export function formatMoney(
  amount: string | number,
  currency = 'VND',
  locale = 'vi-VN',
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    const sym = currencySymbols[currency] ?? currency;
    return `${num.toLocaleString(locale)}${sym}`;
  }
}

export function MoneyCell({ amount, currency = 'VND', locale = 'vi-VN', className, align = 'right' }: MoneyCellProps) {
  return (
    <span
      className={cn(
        'tabular-nums whitespace-nowrap',
        align === 'right' && 'text-right',
        className,
      )}
    >
      {formatMoney(amount, currency, locale)}
    </span>
  );
}
