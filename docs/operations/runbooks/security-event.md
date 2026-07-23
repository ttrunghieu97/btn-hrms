# Runbook: Security Event

## Detection
- Alert: `BruteForceLogin` or `PermissionDeniedSpike` fires
- CSP violation reports spike
- Suspicious activity in audit logs

## Impact
- Potential account compromise
- Data access policy violation
- Brute force attack in progress

## Investigation
1. **Failed logins**: Check auth logs for IP patterns:
   ```bash
   grep "auth_login_failed" /var/log/api/audit.log | cut -d' ' -f5 | sort | uniq -c | sort -nr
   ```
2. **Permission denied**: Check authorization audit logs
3. **CSP violations**: Review report-uri endpoint data
4. **Suspicious IPs**: Check if from known ranges / VPN / proxies

## Mitigation
1. **Brute force**: Rate limit IP at load balancer level
2. **Compromised account**: Revoke all sessions:
   - Admin revokes user tokens via `/auth/revoke-all`
   - Reset user password
   - Force logout on next request
3. **API abuse**: Add IP-based throttling / block IP at LB
4. **Data breach suspected**: Rotate secrets, revoke all tokens

## Recovery
- Confirm attack has stopped
- Notify affected users
- Document incident for compliance

## Postmortem
- Review rate limit thresholds
- Check if additional IP block rules needed
- Update security alert thresholds
