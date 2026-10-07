import { matchRoute } from '../utils/route-matcher';
import { routeRegistry } from '@/shared/authorization';

describe('matchRoute', () => {
  it('matches exact path', () => {
    const result = matchRoute('/employees', routeRegistry);
    expect(result).not.toBeNull();
    expect(result?.route.path).toBe('/employees');
    expect(result?.params).toEqual({});
  });

  it('matches dynamic segment', () => {
    const result = matchRoute('/employees/42', routeRegistry);
    expect(result).not.toBeNull();
    expect(result?.route.path).toBe('/employees/:id');
    expect(result?.params).toEqual({ id: '42' });
  });

  it('returns null for unknown route', () => {
    const result = matchRoute('/nonexistent/page', routeRegistry);
    expect(result).toBeNull();
  });

  it('normalizes trailing slash', () => {
    const result = matchRoute('/employees/', routeRegistry);
    expect(result).not.toBeNull();
    expect(result?.route.path).toBe('/employees');
  });

  it('/employees/new matches before /employees/:id', () => {
    const result = matchRoute('/employees/new', routeRegistry);
    expect(result).not.toBeNull();
    expect(result?.route.path).toBe('/employees/new');
  });
});
