import { Injectable } from '@nestjs/common';
import { AuthUser } from './types/auth-user.interface';
import { DataScope } from './types/data-scope.interface';
import { PolicyEngine } from './policy-engine/policy.engine';
import { throwForbidden } from '../../shared/utils/http-error';
import { ERROR_CODES } from '../../shared/constants/error-codes';
import { ERROR_REASONS } from '../../shared/constants/error-reasons';

@Injectable()
export class QueryScopeService {
  constructor(private readonly policyEngine: PolicyEngine) {}

  /**
   * Resolves the data visibility scope for a given user and domain.
   * Determines what rows a user is allowed to see in list endpoints.
   */
  resolveScope(user: AuthUser, domain: string): DataScope {
    if (!user) {
      throwForbidden('User not authenticated', ERROR_CODES.USER_NOT_AUTHENTICATED, {
        reason: ERROR_REASONS.NO_USER_IN_REQUEST,
      });
    }

    const scopeId = user.scopeId ?? undefined;

    if (user.isSuperAdmin || user.permissions?.includes('ALL')) {
      return { tier: 'all', scopeId };
    }

    if (this.policyEngine.can(user, `${domain}:view:all`) || this.policyEngine.can(user, `${domain}:view`)) {
      return { tier: 'all', scopeId };
    }

    if (this.policyEngine.can(user, `${domain}:view:department`)) {
      if (!user.departmentId) {
         if (this.policyEngine.can(user, `${domain}:view:self`)) {
            return { tier: 'self', scopeId, employeeId: String(user.employeeId) };
         }
         throwForbidden(`User has department view permission but no department assigned`, ERROR_CODES.PERMISSION_DENIED, {
           reason: ERROR_REASONS.MISSING_PERMISSION,
           domain
         });
      }
      return { tier: 'department', scopeId, departmentId: String(user.departmentId) };
    }

    if (this.policyEngine.can(user, `${domain}:view:self`)) {
      if (!user.employeeId) {
         throwForbidden(`User has self view permission but no employee record assigned`, ERROR_CODES.PERMISSION_DENIED, {
           reason: ERROR_REASONS.MISSING_PERMISSION,
           domain
         });
      }
      return { tier: 'self', scopeId, employeeId: String(user.employeeId) };
    }

    throwForbidden(`Bạn không có quyền xem danh sách ${domain}`, ERROR_CODES.PERMISSION_DENIED, {
      missingPermissions: [`${domain}:view:all`, `${domain}:view:department`, `${domain}:view:self`],
      reason: ERROR_REASONS.MISSING_PERMISSION,
    });
  }
}
