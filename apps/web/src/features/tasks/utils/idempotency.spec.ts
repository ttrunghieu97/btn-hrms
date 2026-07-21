import { buildIdempotencyKey, buildIdempotencyHeaders } from './idempotency';

describe('idempotency', () => {
  it('generates a non-empty idempotency key', () => {
    const key = buildIdempotencyKey();
    expect(key).toBeTruthy();
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('generates unique keys on successive calls', () => {
    const key1 = buildIdempotencyKey();
    const key2 = buildIdempotencyKey();
    expect(key1).not.toBe(key2);
  });

  it('builds the correct idempotency header shape', () => {
    const header = buildIdempotencyHeaders();
    expect(header).toHaveProperty('Idempotency-Key');
    expect(typeof header['Idempotency-Key']).toBe('string');
    expect(header['Idempotency-Key'].length).toBeGreaterThan(0);
  });
});
