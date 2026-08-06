'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TimesheetEnhancedDashboardProps {
  employeeStats: {
    totalDays: number;
    workedDays: number;
    leaveDays: number;
    absentDays: number;
    weekendDays: number;
    holidayDays: number;
    totalOT: number;
    totalLateMinutes: number;
    totalEarlyMinutes: number;
    nightShiftHours: number;
    personalBreakMinutes: number;
    workingHours: number;
    overtimeHours: number;
    lateDays: number;
    earlyDays: number;
    presentPercentage: number;
    onTrackPercentage: number;
  };
  period: string;
}

export function TimesheetEnhancedDashboard({ employeeStats, period }: TimesheetEnhancedDashboardProps) {
  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m > 0 ? `${m}m` : ''}`;
  };

  // Transform employeeStats to match actual API structure
  const transformedStats = {
    totalDays: employeeStats.totalDays,
    workedDays: employeeStats.workedDays || 0,
    leaveDays: employeeStats.leaveDays || 0,
    absentDays: employeeStats.absentDays || 0,
    weekendDays: employeeStats.weekendDays || 0,
    holidayDays: employeeStats.holidayDays || 0,
    totalOT: employeeStats.totalOT || 0,
    totalLateMinutes: employeeStats.totalLateMinutes || 0,
    totalEarlyMinutes: employeeStats.totalEarlyMinutes || 0,
    nightShiftHours: employeeStats.nightShiftHours || 0,
    personalBreakMinutes: employeeStats.personalBreakMinutes || 0,
    workingHours: employeeStats.workingHours || 0,
    overtimeHours: employeeStats.overtimeHours || 0,
    lateDays: employeeStats.lateDays || 0,
    earlyDays: employeeStats.earlyDays || 0,
    presentPercentage: employeeStats.presentPercentage || 0,
    onTrackPercentage: employeeStats.onTrackPercentage || 0,
  };

  const metrics = [
    {
      id: 'attendance',
      label: 'ATTENDANCE',
      value: `${employeeStats.workedDays}/${employeeStats.totalDays}`,
      sub: `${employeeStats.presentPercentage}% Present`,
      color: employeeStats.presentPercentage === 100 ? 'text-emerald-400' : employeeStats.presentPercentage > 0 ? 'text-amber-400' : 'text-slate-500',
      icon: '👥',
    },
    {
      id: 'ot',
      label: 'OVERTIME',
      value: formatHours(employeeStats.totalOT),
      sub: `${employeeStats.lateDays} Late · ${employeeStats.earlyDays} Early`,
      color: employeeStats.totalOT > 0 ? 'text-blue-400' : 'text-slate-500',
      icon: '⏰',
    },
    {
      id: 'breaks',
      label: 'TIME OFF',
      value: formatHours(employeeStats.personalBreakMinutes),
      sub: `${employeeStats.nightShiftHours > 0 ? `${employeeStats.nightShiftHours}h Night` : ''}`,
      color: employeeStats.personalBreakMinutes > 0 ? 'text-purple-400' : 'text-slate-500',
      icon: '☕',
    },
    {
      id: 'productivity',
      label: 'PRODUCTIVITY',
      value: formatHours(employeeStats.workingHours),
      sub: `${employeeStats.onTrackPercentage}% On Track`,
      color: employeeStats.onTrackPercentage >= 80 ? 'text-green-400' : employeeStats.onTrackPercentage > 0 ? 'text-cyan-400' : 'text-slate-500',
      icon: '⚡',
    },
  ];

  const statusCards = [
    { label: 'Present', value: employeeStats.workedDays, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: '✓' },
    { label: 'Leave', value: employeeStats.leaveDays, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: 'L' },
    { label: 'Absent', value: employeeStats.absentDays, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: '✗' },
    { label: 'Weekend', value: employeeStats.weekendDays, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30', icon: '🌙' },
    { label: 'Holiday', value: employeeStats.holidayDays, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: '🎉' },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-md">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Period Overview: {period}</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>{new Date(period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-4 gap-1 border-b border-slate-700/50">
        {metrics.map((metric) => (
          <div key={metric.id} className="relative group p-5 transition-all duration-300 hover:bg-slate-800/30">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xl font-bold {metric.color}">{metric.value}</span>
              <span className="text-xl opacity-80 group-hover:scale-110 transition-transform">{metric.icon}</span>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{metric.label}</div>
              <div className={cn("text-xs", metric.color)}>{metric.sub}</div>
            </div>
            <div className={cn("absolute bottom-0 left-0 h-0.5 bg-gradient-to-r transition-all duration-500", metric.color.replace('text-', 'from-'), metric.color.replace('text-', 'to-'))} style={{ width: '100%' }}></div>
          </div>
        ))}
      </div>

      {/* Status Cards */}
      <div className="p-6">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Attendance Breakdown</div>
        <div className="grid grid-cols-5 gap-3">
          {statusCards.map((card) => (
            <div key={card.label} className={cn("relative rounded-lg border p-4 transition-all duration-300 hover:scale-105 hover:shadow-lg", card.bg)}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold {card.color}">{card.value}</span>
                <span className="text-lg font-mono {card.color}">{card.icon}</span>
              </div>
              <div className={cn("text-xs font-semibold uppercase", card.color)}>{card.label}</div>
              <div className={cn("text-xs", card.color.replace('text-', 'text-') + '/70')}>{card.value > 0 ? `${(card.value / employeeStats.totalDays * 100).toFixed(1)}%` : '0%'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Period Progress</div>
          <div className={cn("text-xs font-bold", employeeStats.presentPercentage === 100 ? 'text-emerald-400' : employeeStats.presentPercentage > 0 ? 'text-amber-400' : 'text-slate-500')}>{employeeStats.presentPercentage}% Complete</div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-blue-500 transition-all duration-1000 ease-out"
            style={{ width: `${employeeStats.presentPercentage}%` }}
          />
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent opacity-50" />
    </div>
  );
}