import {
  Release,
  PolicyConfig,
  PolicyEvaluation,
  PolicyEvaluationItem,
  PolicyVerdict,
  Approval
} from '../types/index.ts';

export function evaluateReleasePolicies(
  release: Release,
  config: PolicyConfig,
  approvals: Approval[] = []
): PolicyEvaluation {
  const evaluations: PolicyEvaluationItem[] = [];
  let isBlocked = false;

  // 1. Production Requires Approval
  if (config.productionRequiresApproval && release.targetEnvironment === 'PROD') {
    const validApproval = approvals.find(
      a => a.releaseId === release.id &&
           a.status === 'APPROVED' &&
           a.releasePlanHash === release.planHash &&
           new Date(a.expiresAt).getTime() > Date.now()
    );

    if (!validApproval) {
      evaluations.push({
        ruleId: 'productionRequiresApproval',
        ruleName: 'Production Requires Authorized Human Approval',
        verdict: 'BLOCK',
        reason: 'Target environment is PROD and no active, unexpired, matching human approval was found.',
        details: 'An authorized Release Manager or Tech Lead must review and approve this release plan before execution.'
      });
      isBlocked = true;
    } else {
      evaluations.push({
        ruleId: 'productionRequiresApproval',
        ruleName: 'Production Requires Authorized Human Approval',
        verdict: 'PASS',
        reason: `Valid human approval by ${validApproval.approverName} (${validApproval.approverRole}) verified.`,
        details: `Approval ID ${validApproval.id} active until ${validApproval.expiresAt}.`
      });
    }
  }

  // 2. Failed or Missing Tests
  if (config.blockOnFailedTests) {
    if (!release.evidence.tests.hasRun || release.evidence.tests.totalTests === 0) {
      evaluations.push({
        ruleId: 'blockOnFailedTests',
        ruleName: 'Mandatory Automated Test Run',
        verdict: 'BLOCK',
        reason: 'No automated tests have been executed for this release build.',
        details: 'Unit and regression test suites must be executed before deployment.'
      });
      isBlocked = true;
    } else if (!release.evidence.tests.passed || release.evidence.tests.failedTests > 0) {
      evaluations.push({
        ruleId: 'blockOnFailedTests',
        ruleName: 'Zero Test Failures Required',
        verdict: 'BLOCK',
        reason: `${release.evidence.tests.failedTests} unit test(s) failed out of ${release.evidence.tests.totalTests}.`,
        details: 'All automated tests must pass with 0 failures prior to release.'
      });
      isBlocked = true;
    } else if (release.evidence.tests.codeCoveragePercent < config.minCodeCoveragePercent) {
      evaluations.push({
        ruleId: 'blockOnFailedTests',
        ruleName: `Minimum Code Coverage (${config.minCodeCoveragePercent}%)`,
        verdict: 'WARNING',
        reason: `Current code coverage is ${release.evidence.tests.codeCoveragePercent}%, below target ${config.minCodeCoveragePercent}%.`,
        details: 'Coverage does not meet threshold; deployment may proceed with architectural warning.'
      });
    } else {
      evaluations.push({
        ruleId: 'blockOnFailedTests',
        ruleName: 'Automated Test Verification',
        verdict: 'PASS',
        reason: `All ${release.evidence.tests.totalTests} tests passed with ${release.evidence.tests.codeCoveragePercent}% coverage.`,
        details: 'Test suite passed validation gates.'
      });
    }
  }

  // 3. Block on Critical Risk
  if (config.blockOnCriticalRisk) {
    const riskScore = release.riskScore ?? 0;
    if (riskScore > config.maxAcceptableRiskScore || release.riskLevel === 'CRITICAL') {
      evaluations.push({
        ruleId: 'blockOnCriticalRisk',
        ruleName: 'Critical Risk Gate',
        verdict: 'BLOCK',
        reason: `Risk score (${riskScore}) exceeds maximum acceptable threshold (${config.maxAcceptableRiskScore}).`,
        details: 'Critical risk releases cannot be executed. Remediation required.'
      });
      isBlocked = true;
    } else if (riskScore > 50) {
      evaluations.push({
        ruleId: 'blockOnCriticalRisk',
        ruleName: 'Elevated Risk Monitor',
        verdict: 'WARNING',
        reason: `Risk score (${riskScore}) is elevated (HIGH tier).`,
        details: 'Monitor deployment closely and review risk findings.'
      });
    } else {
      evaluations.push({
        ruleId: 'blockOnCriticalRisk',
        ruleName: 'Risk Level Gate',
        verdict: 'PASS',
        reason: `Risk score (${riskScore}) is within acceptable tolerances.`,
        details: 'Release meets risk threshold criteria.'
      });
    }
  }

  // 4. Block on Missing Required Evidence
  if (config.blockOnMissingRequiredEvidence) {
    const missing = release.evidence.missingEvidenceFields || [];
    if (missing.length > 0) {
      evaluations.push({
        ruleId: 'blockOnMissingRequiredEvidence',
        ruleName: 'Mandatory Release Evidence Completeness',
        verdict: 'BLOCK',
        reason: `${missing.length} mandatory evidence item(s) are missing from the release audit package.`,
        details: `Missing items: ${missing.join(', ')}.`
      });
      isBlocked = true;
    } else {
      evaluations.push({
        ruleId: 'blockOnMissingRequiredEvidence',
        ruleName: 'Mandatory Release Evidence Completeness',
        verdict: 'PASS',
        reason: 'All required evidence documents and validation reports are attached.',
        details: 'Evidence audit trail complete.'
      });
    }
  }

  // 5. Environment Match (Sequential Tier Promotion)
  if (config.requireEnvironmentMatch) {
    const envRank: Record<string, number> = { DEV: 1, QA: 2, UAT: 3, STAGING: 4, PROD: 5 };
    const src = envRank[release.sourceEnvironment] || 1;
    const tgt = envRank[release.targetEnvironment] || 5;

    if (tgt - src > 1) {
      evaluations.push({
        ruleId: 'requireEnvironmentMatch',
        ruleName: 'Sequential Environment Promotion Gate',
        verdict: 'BLOCK',
        reason: `Direct promotion from ${release.sourceEnvironment} to ${release.targetEnvironment} skips intermediate validation environments.`,
        details: 'Releases must be certified sequentially through QA and STAGING before promoting to PROD.'
      });
      isBlocked = true;
    } else {
      evaluations.push({
        ruleId: 'requireEnvironmentMatch',
        ruleName: 'Sequential Environment Promotion Gate',
        verdict: 'PASS',
        reason: `Promotion path ${release.sourceEnvironment} -> ${release.targetEnvironment} adheres to promotional hierarchy.`,
        details: 'Environment sequence verified.'
      });
    }
  }

  // 6. Destructive Actions Safeguard
  if (config.requireConfirmationForDestructiveActions) {
    const destructive = release.components.filter(c => c.isDestructive || c.action === 'DELETE');
    if (destructive.length > 0) {
      evaluations.push({
        ruleId: 'requireConfirmationForDestructiveActions',
        ruleName: 'Destructive Component Safeguard',
        verdict: 'WARNING',
        reason: `${destructive.length} destructive component action(s) detected (${destructive.map(d => d.name).join(', ')}).`,
        details: 'Requires explicit administrator sign-off acknowledging schema deprecation risk.'
      });
    } else {
      evaluations.push({
        ruleId: 'requireConfirmationForDestructiveActions',
        ruleName: 'Destructive Component Safeguard',
        verdict: 'PASS',
        reason: 'Zero destructive schema deletions or modifications found in release package.',
        details: 'No destructive risks identified.'
      });
    }
  }

  const overallVerdict: PolicyVerdict = isBlocked
    ? 'BLOCK'
    : evaluations.some(e => e.verdict === 'WARNING')
      ? 'WARNING'
      : 'PASS';

  return {
    id: `POL-${release.id}-${Date.now().toString(36)}`,
    releaseId: release.id,
    overallVerdict,
    isBlocked,
    evaluations,
    evaluatedAt: new Date().toISOString()
  };
}
