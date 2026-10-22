export { requirePagePermission } from './guards/page-permission';
export {
  generateNav,
  getAllNavItems,
  type GenerateNavOptions,
  type NavGroup,
  type NavItem,
} from './utils/nav-generator';
export { matchRoute, type MatchResult } from './utils/route-matcher';
export {
  canAccessRoute,
  findRoute,
  getAllRoutes,
  resolveRoutePermission,
} from './utils/route-resolver';
