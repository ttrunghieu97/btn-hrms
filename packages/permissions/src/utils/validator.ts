import { hierarchyMap } from '../hierarchy';

export interface ValidationError {
  type: 'circular' | 'duplicate' | 'incomplete';
  permission: string;
  chain: readonly string[];
  message: string;
}

/**
 * Validate hierarchy map.
 *
 * Each entry maps a permission to an ordered chain from leaf → root:
 *   'attendance:view:self' → ['attendance:view:self', 'attendance:view:department', 'attendance:view:all']
 * The key is always at index 0 — that is by design.
 *
 * Checks:
 * - Duplicates: key appears more than once in its chain
 * - Gaps: chain has only 1 element (key == root, no actual hierarchy)
 * - Circular: a parent in chain resolves back to a descendant
 */
export function validateHierarchy(): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [perm, chain] of Object.entries(hierarchyMap)) {
    if (!Array.isArray(chain)) {
      errors.push({
        type: 'incomplete',
        permission: perm,
        chain: [perm],
        message: `"${perm}" hierarchy is not an array`,
      });
      continue;
    }

    if (chain.length < 1) {
      errors.push({
        type: 'incomplete',
        permission: perm,
        chain: [perm],
        message: `"${perm}" hierarchy is empty`,
      });
      continue;
    }

    // Chain must start with the key itself
    if (chain[0] !== perm) {
      errors.push({
        type: 'incomplete',
        permission: perm,
        chain,
        message: `"${perm}" chain does not start with "${perm}"`,
      });
    }

    // Duplicate: key appears MORE than once in chain (allowed once at index 0)
    const rest = chain.slice(1);
    if (rest.includes(perm)) {
      errors.push({
        type: 'duplicate',
        permission: perm,
        chain,
        message: `"${perm}" appears multiple times in its own hierarchy chain`,
      });
    }

    // Circular: walk parents and check none cycles back
    const visited = new Set<string>();
    visited.add(perm);

    for (let i = 1; i < chain.length; i++) {
      const parent = chain[i];
      if (!parent) continue;
      if (visited.has(parent)) {
        errors.push({
          type: 'circular',
          permission: perm,
          chain,
          message: `Circular: "${perm}" chain contains duplicate "${parent}"`,
        });
        break;
      }
      visited.add(parent);
    }
  }

  return errors;
}

/** Quick check — true if hierarchy has no errors. */
export function isHierarchyValid(): boolean {
  return validateHierarchy().length === 0;
}
