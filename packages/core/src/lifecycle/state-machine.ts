import { Release, ReleaseStatus, Approval, PolicyEvaluation } from '../types/index.ts';
import { ReleaseRepo, ApprovalRepo, PolicyRepo, RiskRepo, AuditRepo } from '../database/db.ts';
import { evaluateReleaseRisk } from '../risk-engine/index.ts';
import { evaluateReleasePolicies } from '../policy-engine/index.ts';
import { calculatePlanHash } from '../database/seed.ts';
import { agentiaAdapter } from '../adapters/agentia-adapter.ts';

const VALID_TRANSITIONS: Record<ReleaseStatus, ReleaseStatus[]> = {
  DRAFT: ['INSPECTED', 'BLOCKED'],
  INSPECTED: ['ANALYZED', 'BLOCKED', 'DRAFT'],
  ANALYZED: ['VALIDATED', 'BLOCKED', 'DRAFT'],
  VALIDATED: ['AWAITING_APPROVAL', 'APPROVED', 'BLOCKED', 'EXECUTING'],
  AWAITING_APPROVAL: ['APPROVED', 'BLOCKED', 'DRAFT'],
  APPROVED: ['EXECUTING', 'BLOCKED', 'DRAFT', 'AWAITING_APPROVAL'],
  EXECUTING: ['COMPLETED', 'FAILED', 'BLOCKED'],
  COMPLETED: [],
  FAILED: ['DRAFT', 'INSPECTED', 'BLOCKED'],
  BLOCKED: ['DRAFT', 'INSPECTED', 'ANALYZED', 'VALIDATED']
};

export class ReleaseLifecycleManager {
  /**
   * Validate if transition from current state to target state is allowed
   */
  canTransition(current: ReleaseStatus, target: ReleaseStatus): boolean {
    return VALID_TRANSITIONS[current]?.includes(target) ?? false;
  }

  /**
   * Transition release to new state with audit logging
   */
  transition(release: Release, target: ReleaseStatus, actor: string, reason?: string): Release {
    if (!this.canTransition(release.status, target)) {
      throw new Error(`Invalid state transition: Cannot transition from ${release.status} to ${target}`);
    }

    const previousStatus = release.status;
    release.status = target;
    release.updatedAt = new Date().toISOString();
    ReleaseRepo.save(release);

    AuditRepo.record({
      releaseId: release.id,
      action: 'RELEASE_STATE_TRANSITION',
      actor,
      actorType: 'SYSTEM',
      timestamp: new Date().toISOString(),
      details: { previousStatus, newStatus: target, reason: reason || 'Standard lifecycle progression' },
      verdict: target === 'BLOCKED' ? 'BLOCK' : 'SUCCESS'
    });

    return release;
  }

  /**
   * Invalidate approvals if release plan hash changed
   */
  checkAndInvalidateOnPlanChange(release: Release): boolean {
    const newHash = calculatePlanHash(release);
    if (release.planHash && release.planHash !== newHash) {
      // Plan hash changed! Existing approvals are invalidated
      release.planHash = newHash;
      const approvals = ApprovalRepo.getByRelease(release.id);
      for (const app of approvals) {
        if (app.status === 'APPROVED' || app.status === 'PENDING') {
          app.status = 'EXPIRED';
          app.notes = (app.notes || '') + ' [INVALIDATED: Release plan modified after approval]';
          ApprovalRepo.save(app);
        }
      }

      if (release.status === 'APPROVED' || release.status === 'AWAITING_APPROVAL') {
        release.status = 'DRAFT';
      }
      ReleaseRepo.save(release);

      AuditRepo.record({
        releaseId: release.id,
        action: 'APPROVAL_INVALIDATED_PLAN_CHANGED',
        actor: 'Release Governance Invariant',
        actorType: 'SYSTEM',
        timestamp: new Date().toISOString(),
        details: { oldHash: release.planHash, newHash },
        verdict: 'WARNING'
      });
      return true;
    }
    return false;
  }

  /**
   * Pre-flight safe execution verification
   */
  verifyExecutionPrerequisites(release: Release): { ok: boolean; error?: string } {
    // 1. Plan hash integrity
    const currentHash = calculatePlanHash(release);
    if (release.planHash !== currentHash) {
      return { ok: false, error: 'Release plan hash mismatch! The release components were modified.' };
    }

    // 2. Production approval check
    if (release.targetEnvironment === 'PROD') {
      const approvals = ApprovalRepo.getByRelease(release.id);
      const valid = approvals.find(
        a => a.status === 'APPROVED' &&
             a.releasePlanHash === release.planHash &&
             new Date(a.expiresAt).getTime() > Date.now()
      );
      if (!valid) {
        return { ok: false, error: 'Target environment is PROD but no active, unexpired human approval exists.' };
      }
    }

    // 3. Recalculate risk on the fly
    const config = PolicyRepo.getConfig();
    const risk = evaluateReleaseRisk(release);
    if (risk.level === 'CRITICAL' || risk.score > config.maxAcceptableRiskScore) {
      return { ok: false, error: `Pre-execution risk recalculation failed: ${risk.score}/100 exceeds threshold.` };
    }

    // 4. Revalidate mandatory policies
    const policyResult = evaluateReleasePolicies(release, config, ApprovalRepo.getByRelease(release.id));
    if (policyResult.isBlocked) {
      const blockedRules = policyResult.evaluations.filter(e => e.verdict === 'BLOCK').map(e => e.ruleName).join(', ');
      return { ok: false, error: `Mandatory policy gate blocked execution: ${blockedRules}` };
    }

    return { ok: true };
  }
}

export const releaseLifecycleManager = new ReleaseLifecycleManager();
