import { TASK_STATUS_MAP } from './task-status';

describe('task status', () => {
  it('maps all expected statuses', () => {
    const statuses = Object.keys(TASK_STATUS_MAP);
    expect(statuses).toContain('created');
    expect(statuses).toContain('assigned');
    expect(statuses).toContain('in_progress');
    expect(statuses).toContain('declined');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('cancelled');
  });

  it('provides a label for each status', () => {
    for (const [status, config] of Object.entries(TASK_STATUS_MAP)) {
      expect(config.label).toBeTruthy();
      expect(typeof config.label).toBe('string');
    }
  });

  it('provides variant for each status', () => {
    for (const config of Object.values(TASK_STATUS_MAP)) {
      expect(['default', 'secondary', 'destructive', 'outline']).toContain(config.variant);
    }
  });
});
