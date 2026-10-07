let cycleCounter = 0;

export interface PerformanceCycle {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed';
  startsOn: string;
  endsOn: string;
  createdAt: string;
  updatedAt: string;
}

export function createPerformanceCycleFactory(
  overrides: Partial<PerformanceCycle> = {},
): PerformanceCycle {
  cycleCounter += 1;
  return {
    id: `cycle-${cycleCounter}`,
    name: `Performance Cycle ${cycleCounter}`,
    status: 'draft',
    startsOn: '2026-01-01',
    endsOn: '2026-12-31',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

let goalCounter = 0;

export interface PerformanceGoal {
  id: string;
  cycleId: string;
  employeeId: string;
  title: string;
  status: 'draft' | 'submitted' | 'approved';
  targetValue?: number;
  createdAt: string;
  updatedAt: string;
}

export function createPerformanceGoalFactory(
  overrides: Partial<PerformanceGoal> = {},
): PerformanceGoal {
  goalCounter += 1;
  return {
    id: `goal-${goalCounter}`,
    cycleId: 'cycle-1',
    employeeId: `emp-${goalCounter}`,
    title: `Goal ${goalCounter}`,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
