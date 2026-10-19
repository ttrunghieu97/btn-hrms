import { sanitizeInternalRedirectPath } from './auth-landing';

describe('sanitizeInternalRedirectPath', () => {
  it('preserves valid internal paths with query and hash', () => {
    expect(sanitizeInternalRedirectPath('/employees')).toBe('/employees');
    expect(sanitizeInternalRedirectPath('/employees?page=2&search=an#profile')).toBe(
      '/employees?page=2&search=an#profile'
    );
  });

  it('blocks external URLs, protocol-relative URLs, and backslash bypasses', () => {
    expect(sanitizeInternalRedirectPath('https://evil.com', '/overview')).toBe('/overview');
    expect(sanitizeInternalRedirectPath('http://evil.com/phish', '/overview')).toBe('/overview');
    expect(sanitizeInternalRedirectPath('//evil.com', '/overview')).toBe('/overview');
    expect(sanitizeInternalRedirectPath('///evil.com', '/overview')).toBe('/overview');
    expect(sanitizeInternalRedirectPath('/\\evil.com', '/overview')).toBe('/overview');
    expect(sanitizeInternalRedirectPath('/foo\\bar', '/overview')).toBe('/overview');
    expect(sanitizeInternalRedirectPath('javascript:alert(1)', '/overview')).toBe('/overview');
    expect(sanitizeInternalRedirectPath('/overview\r\nSet-Cookie: x=1', '/overview')).toBe('/overview');
  });

  it('returns fallback for null, undefined, or empty string', () => {
    expect(sanitizeInternalRedirectPath(null, '/fallback')).toBe('/fallback');
    expect(sanitizeInternalRedirectPath(undefined, '/fallback')).toBe('/fallback');
    expect(sanitizeInternalRedirectPath('   ', '/fallback')).toBe('/fallback');
  });
});
