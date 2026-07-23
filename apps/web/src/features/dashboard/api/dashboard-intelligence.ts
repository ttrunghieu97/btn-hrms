import type { SmartDashboardMetrics, AttentionItem, InsightData } from '@/components/platform';

export type DashboardPersona = 'employee' | 'manager' | 'hr' | 'executive';

/**
 * Dashboard intelligence adapter.
 *
 * Phase 1: Client-side composition from existing feature data.
 * Phase 2: Replace with dedicated backend insight endpoint.
 *
 * Returns insights + attention items for the given persona/role.
 * Currently uses placeholder data — wire to real queries when available.
 */
export function getDashboardInsights(persona: DashboardPersona): SmartDashboardMetrics {
  // Phase 1 placeholder — returns representative data per persona.
  // Replace each section with actual feature queries:
  //
  //   const attendance = await useMyAttendanceTodayQuery();
  //   const leaveBal = await useMyLeaveBalanceQuery();
  //   ...

  switch (persona) {
    case 'employee':
      return {
        insights: [
          { id: 'attendance', title: 'Attendance Today', value: 'Checked in', description: '08:02 AM — On time' },
          { id: 'leave-balance', title: 'Annual Leave', value: '12 days', trend: { direction: 'neutral', value: 'remaining' }, description: 'Of 15 days total' },
          { id: 'pending', title: 'Pending Requests', value: '2', trend: { direction: 'up', value: '1 new' }, description: 'Requires your action' },
        ],
        attention: [],
      };

    case 'manager':
      return {
        insights: [
          { id: 'team-attendance', title: 'Team Attendance', value: '92%', trend: { direction: 'up', value: '2% vs last week' }, description: '42/46 present today' },
          { id: 'late-arrivals', title: 'Late Arrivals', value: '3', trend: { direction: 'down', value: '1 less than yesterday' } },
          { id: 'pending-approvals', title: 'Pending Approvals', value: '5', trend: { direction: 'neutral', value: 'awaiting review' } },
        ],
        attention: [
          { id: 'leave-conflict', title: 'Team leave overlap', description: '3 team members on leave next Thursday — review coverage', severity: 'warning', action: { label: 'View team', href: '/employees' } },
        ],
      };

    case 'hr':
      return {
        insights: [
          { id: 'headcount', title: 'Headcount', value: '1,248', trend: { direction: 'up', value: '+12 this month' } },
          { id: 'attrition', title: 'Attrition Rate', value: '2.1%', trend: { direction: 'down', value: '0.3% MoM' }, description: 'Below industry average' },
          { id: 'time-to-hire', title: 'Avg Time to Hire', value: '18 days', trend: { direction: 'down', value: '3 days faster' } },
        ],
        attention: [
          { id: 'expiring-contracts', title: 'Contracts expiring', description: '12 contracts expire within 30 days', severity: 'warning', action: { label: 'Review', href: '/contracts' } },
          { id: 'missing-docs', title: 'Missing documents', description: '8 employee profiles lack required documents', severity: 'warning', action: { label: 'View', href: '/employees' } },
          { id: 'onboarding-stuck', title: 'Onboarding blocked', description: '5 onboarding processes waiting on equipment', severity: 'info', action: { label: 'Open', href: '/onboarding' } },
        ],
      };

    case 'executive':
      return {
        insights: [
          { id: 'workforce', title: 'Total Workforce', value: '1,248', trend: { direction: 'up', value: '2.3% YoY' } },
          { id: 'revenue-per-employee', title: 'Revenue per Employee', value: '$85K', trend: { direction: 'up', value: '5% vs Q1' } },
          { id: 'cost-per-head', title: 'Cost per Head', value: '$42K', trend: { direction: 'neutral', value: 'stable' } },
        ],
        attention: [
          { id: 'sla-breach', title: 'Payroll SLA at risk', description: 'Payroll run scheduled in 2 days — pending approvals', severity: 'warning', action: { label: 'View', href: '/payroll' } },
        ],
      };
  }
}
