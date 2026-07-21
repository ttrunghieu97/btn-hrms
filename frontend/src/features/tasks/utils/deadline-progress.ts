/**
 * Deadline progress utilities.
 * Calculates how close a task is to its deadline and returns
 * the appropriate color, labels, and state properties.
 */

export type DeadlineUrgency = 'new' | 'mid' | 'warning' | 'danger' | 'overdue';

export interface DeadlineInfo {
  ratio: number;
  urgency: DeadlineUrgency;
  remainingLabel: string;
  elapsedLabel: string;
  badgeBgColor: string;
  badgeTextColor: string;
  barBgColor: string;
  dotColor: string;
}

export function getDeadlineInfo(
  createdAt: string | null | undefined,
  dueDate: string | null | undefined,
  completedAt?: string | null | undefined,
): DeadlineInfo | null {
  if (!createdAt || !dueDate) return null;

  const created = new Date(createdAt).getTime();
  const due = new Date(dueDate).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();

  if (Number.isNaN(created) || Number.isNaN(due)) return null;

  let total = due - created;
  if (total <= 0) {
    total = 1; // Prevent division by zero or negative total time, forcing ratio to indicate overdue
  }

  const elapsed = end - created;
  const ratio = elapsed / total;

  const msRemaining = due - end;
  const daysRemaining = Math.ceil(Math.abs(msRemaining) / (1000 * 60 * 60 * 24));
  const isCompleted = !!completedAt;

  // 1. Determine urgency state & styles
  let urgency: DeadlineUrgency = 'new';
  let badgeBgColor = 'bg-emerald-50 dark:bg-emerald-950/30';
  let badgeTextColor = 'text-emerald-700 dark:text-emerald-400';
  let barBgColor = 'bg-emerald-500';
  let dotColor = 'bg-emerald-500';

  if (ratio > 1) {
    urgency = 'overdue';
    badgeBgColor = 'bg-zinc-100 dark:bg-zinc-800';
    badgeTextColor = 'text-zinc-700 dark:text-zinc-300';
    barBgColor = 'bg-zinc-600 dark:bg-zinc-400';
    dotColor = 'bg-zinc-600 dark:bg-zinc-400';
  } else if (ratio > 0.9) {
    urgency = 'danger';
    badgeBgColor = 'bg-red-50 dark:bg-red-950/30';
    badgeTextColor = 'text-red-700 dark:text-red-400';
    barBgColor = 'bg-red-500';
    dotColor = 'bg-red-500';
  } else if (ratio > 0.75) {
    urgency = 'warning';
    badgeBgColor = 'bg-orange-50 dark:bg-orange-950/30';
    badgeTextColor = 'text-orange-700 dark:text-orange-400';
    barBgColor = 'bg-orange-500';
    dotColor = 'bg-orange-500';
  } else if (ratio > 0.5) {
    urgency = 'mid';
    badgeBgColor = 'bg-yellow-50 dark:bg-yellow-950/30';
    badgeTextColor = 'text-yellow-700 dark:text-yellow-400';
    barBgColor = 'bg-yellow-500';
    dotColor = 'bg-yellow-500';
  }

  // 2. Format remaining/overdue label
  let remainingLabel = '';
  if (isCompleted) {
    const isOverdue = due < end;
    const diffDays = Math.ceil(Math.abs(due - end) / (1000 * 60 * 60 * 24));
    if (isOverdue) {
      remainingLabel = `Hoàn thành trễ ${diffDays} ngày`;
    } else {
      remainingLabel = diffDays === 0 ? 'Hoàn thành đúng hạn' : `Hoàn thành sớm ${diffDays} ngày`;
    }
  } else {
    if (ratio > 1) {
      const daysOver = Math.ceil((end - due) / (1000 * 60 * 60 * 24));
      remainingLabel = `Quá hạn ${daysOver} ngày`;
    } else if (msRemaining <= 1000 * 60 * 60 * 24) {
      remainingLabel = 'Hôm nay đến hạn';
    } else {
      remainingLabel = `Còn ${daysRemaining} ngày`;
    }
  }

  // 3. Format elapsed percentage label
  const pct = Math.round(Math.min(ratio * 100, 100));
  let elapsedLabel = '';
  if (isCompleted) {
    elapsedLabel = `Đã dùng ${pct}% quỹ thời gian trước khi hoàn thành`;
  } else {
    if (ratio > 1) {
      elapsedLabel = `Đã vượt quá ${Math.round((ratio - 1) * 100)}% thời gian được cấp`;
    } else {
      elapsedLabel = `Đã tiêu tốn ${pct}% thời gian được cấp`;
    }
  }

  return {
    ratio,
    urgency,
    remainingLabel,
    elapsedLabel,
    badgeBgColor,
    badgeTextColor,
    barBgColor,
    dotColor,
  };
}
