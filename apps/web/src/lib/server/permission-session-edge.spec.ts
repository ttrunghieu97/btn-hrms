import { encodePermissions, decodePermissions } from './permission-session-edge';

describe('permission-session-edge', () => {
  const secret = 'super-secret-test-key-32-chars-long!!';

  it('should encode and decode permissions correctly', async () => {
    const permissions = ['employee:read', 'employee:write'];
    const encoded = await encodePermissions(permissions, secret);

    expect(encoded).toMatch(/^ps_v2:[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

    const decoded = await decodePermissions(encoded, secret);
    expect(decoded).not.toBeNull();
    expect(decoded?.permissions).toEqual(permissions);
    expect(decoded?.version).toBe(2);
    expect(decoded?.timestamp).toBeGreaterThan(0);
  });

  it('should reject tampered payload', async () => {
    const permissions = ['employee:read'];
    const encoded = await encodePermissions(permissions, secret);

    const [prefixAndPayload, sig] = encoded.split('.');
    // Tamper payload to inject sys:all
    const fakePayload = Buffer.from(
      JSON.stringify({ permissions: ['sys:all'], version: 2, timestamp: Date.now() })
    )
      .toString('base64url');

    const tampered = `ps_v2:${fakePayload}.${sig}`;
    const decoded = await decodePermissions(tampered, secret);
    expect(decoded).toBeNull();
  });

  it('should reject tampered signature', async () => {
    const permissions = ['employee:read'];
    const encoded = await encodePermissions(permissions, secret);

    const [prefixAndPayload] = encoded.split('.');
    const tampered = `${prefixAndPayload}.fakeSignature123`;

    const decoded = await decodePermissions(tampered, secret);
    expect(decoded).toBeNull();
  });

  it('should reject legacy unauthenticated ps_v1 tokens', async () => {
    const legacy = 'ps_v1:eyJwZXJtaXNzaW9ucyI6WyJzeXM6YWxsIl0sInZlcnNpb24iOjEsInRpbWVzdGFtcCI6MTIzfQ';
    const decoded = await decodePermissions(legacy, secret);
    expect(decoded).toBeNull();
  });

  it('should reject tokens signed with a different secret', async () => {
    const permissions = ['employee:read'];
    const encoded = await encodePermissions(permissions, secret);

    const differentSecret = 'different-secret-key-that-does-not-match';
    const decoded = await decodePermissions(encoded, differentSecret);
    expect(decoded).toBeNull();
  });

  it('should reject expired tokens older than 24 hours', async () => {
    const permissions = ['employee:read'];
    // Mock Date.now during encode
    const originalNow = Date.now;
    const pastTime = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

    jest.spyOn(Date, 'now').mockReturnValue(pastTime);
    const encoded = await encodePermissions(permissions, secret);

    // Restore Date.now to current time
    Date.now = originalNow;
    const decoded = await decodePermissions(encoded, secret);
    expect(decoded).toBeNull();
  });

  it('should safely handle garbage/malformed strings', async () => {
    expect(await decodePermissions('', secret)).toBeNull();
    expect(await decodePermissions('invalid', secret)).toBeNull();
    expect(await decodePermissions('ps_v2:', secret)).toBeNull();
    expect(await decodePermissions('ps_v2:not-a-dot', secret)).toBeNull();
    expect(await decodePermissions('ps_v2:...', secret)).toBeNull();
  });
});
