import { describe, it, expect } from 'vitest';
import { validateHierarchy, isHierarchyValid } from '../utils/validator';
import * as hierarchyMod from '../hierarchy';

describe('validateHierarchy', () => {
  it('current hierarchy passes validation (no errors)', () => {
    const errors = validateHierarchy();
    expect(errors.length).toBe(0);
  });

  it('isHierarchyValid returns true for current hierarchy', () => {
    expect(isHierarchyValid()).toBe(true);
  });
});

describe('hierarchy structure', () => {
  it('every chain starts with its own key', () => {
    for (const [key, chain] of Object.entries(hierarchyMod.hierarchyMap)) {
      if (Array.isArray(chain) && chain.length > 0) {
        expect(chain[0]).toBe(key);
      }
    }
  });

  it('attendance chain is self → department → all', () => {
    expect(hierarchyMod.hierarchyMap['attendance:view:self']).toEqual([
      'attendance:view:self',
      'attendance:view:department',
      'attendance:view:all',
    ]);
  });

  it('leave chain is self → department → all', () => {
    expect(hierarchyMod.hierarchyMap['leave:view:self']).toEqual([
      'leave:view:self',
      'leave:view:department',
      'leave:view:all',
    ]);
  });
});
