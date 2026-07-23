# Runbook: Deployment Rollback

## Detection
- Monitored via CI/CD pipeline automated checks
- Alert: `HighErrorRate` spikes after deployment
- Health check fails after deployment

## Impact
- Current deployment is degraded
- Users experiencing errors/high latency

## Rollback Steps
1. **Identify current version**:
   ```bash
   git log -1 --oneline
   ```
2. **Rollback via git**:
   ```bash
   git revert HEAD
   git push origin master
   ```
3. **Or rollback via image tag** (containerized):
   ```bash
   kubectl rollout undo deployment/api -n hrms
   ```
4. **Verify rollback**:
   ```bash
   curl -s https://api.example.com/ready/strict
   ```

## Post-Rollback
- Confirm previous version is stable
- Check metrics for regression
- Investigate root cause of failed deployment
- Fix forward (new PR) — do not re-attempt same deploy

## Postmortem
- Document what caused the failure
- Update CI tests to catch regression
- If migration caused failure, add dry-run to pipeline
