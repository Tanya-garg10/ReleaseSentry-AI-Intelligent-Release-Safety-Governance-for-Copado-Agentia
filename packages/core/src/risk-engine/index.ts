import { Release, RiskAssessment, RiskFinding, RiskLevel } from '../types/index.ts';

export interface RiskWeights {
  missingTests: number;
  failingTests: number;
  lowCoverage: number;
  environmentMismatch: number;
  unresolvedDependencies: number;
  destructiveComponents: number;
  criticalSecurity: number;
  highSecurity: number;
  missingMandatoryEvidence: number;
}

export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  missingTests: 35,
  failingTests: 30,
  lowCoverage: 15,
  environmentMismatch: 25,
  unresolvedDependencies: 20,
  destructiveComponents: 15,
  criticalSecurity: 40,
  highSecurity: 20,
  missingMandatoryEvidence: 15
};

export function classifyRiskLevel(score: number): RiskLevel {
  if (score <= 25) return 'LOW';
  if (score <= 50) return 'MEDIUM';
  if (score <= 75) return 'HIGH';
  return 'CRITICAL';
}

export function evaluateReleaseRisk(release: Release, weights: RiskWeights = DEFAULT_RISK_WEIGHTS): RiskAssessment {
  const findings: RiskFinding[] = [];
  let rawScore = 0;

  // 1. Evaluate Tests
  if (!release.evidence.tests.hasRun || release.evidence.tests.totalTests === 0) {
    findings.push({
      id: `RSK-FND-${findings.length + 1}`,
      title: 'Missing Automated Test Execution Evidence',
      severity: 'CRITICAL',
      category: 'TESTING',
      evidence: 'No test execution runs found in the release evidence bundle.',
      riskContribution: weights.missingTests,
      recommendedRemediation: 'Execute Copado Agentia automated test runner on source branch before release promotion.',
      isUnknown: true
    });
    rawScore += weights.missingTests;
  } else if (!release.evidence.tests.passed || release.evidence.tests.failedTests > 0) {
    findings.push({
      id: `RSK-FND-${findings.length + 1}`,
      title: `${release.evidence.tests.failedTests} Unit Test Failure(s) Detected`,
      severity: 'HIGH',
      category: 'TESTING',
      evidence: `${release.evidence.tests.failedTests} of ${release.evidence.tests.totalTests} tests failed in execution report.`,
      riskContribution: weights.failingTests,
      recommendedRemediation: 'Fix failing unit tests in Apex class test suites and re-run pipeline.',
      isUnknown: false
    });
    rawScore += weights.failingTests;
  } else if (release.evidence.tests.codeCoveragePercent < 75) {
    findings.push({
      id: `RSK-FND-${findings.length + 1}`,
      title: `Low Code Coverage (${release.evidence.tests.codeCoveragePercent}% < 75%)`,
      severity: 'MEDIUM',
      category: 'TESTING',
      evidence: `Apex code coverage is ${release.evidence.tests.codeCoveragePercent}%, below the 75% enterprise deployment gate.`,
      riskContribution: weights.lowCoverage,
      recommendedRemediation: 'Add comprehensive unit tests targeting uncovered branch logic in modified Apex classes.',
      isUnknown: false
    });
    rawScore += weights.lowCoverage;
  }

  // 2. Evaluate Environment Tiering
  const envRank: Record<string, number> = { DEV: 1, QA: 2, UAT: 3, STAGING: 4, PROD: 5 };
  const sourceRank = envRank[release.sourceEnvironment] || 1;
  const targetRank = envRank[release.targetEnvironment] || 5;

  if (targetRank - sourceRank > 1) {
    findings.push({
      id: `RSK-FND-${findings.length + 1}`,
      title: `Tier-Skipping Environment Promotion (${release.sourceEnvironment} -> ${release.targetEnvironment})`,
      severity: 'HIGH',
      category: 'ENVIRONMENT',
      evidence: `Direct promotion jumps ${targetRank - sourceRank} pipeline stages without intermediate validation.`,
      riskContribution: weights.environmentMismatch,
      recommendedRemediation: 'Follow the progressive promotion model: certify changes in QA and STAGING before promoting to PROD.',
      isUnknown: false
    });
    rawScore += weights.environmentMismatch;
  }

  // 3. Evaluate Dependencies
  if (release.evidence.dependencies.unresolvedCount > 0 || release.evidence.dependencies.missingPackages.length > 0) {
    findings.push({
      id: `RSK-FND-${findings.length + 1}`,
      title: `${release.evidence.dependencies.unresolvedCount} Unverified Dependency / Package(s)`,
      severity: 'HIGH',
      category: 'DEPENDENCY',
      evidence: release.evidence.dependencies.missingPackages.length > 0
        ? `Missing/unverified packages: ${release.evidence.dependencies.missingPackages.join(', ')}`
        : `${release.evidence.dependencies.unresolvedCount} unresolved package dependencies found.`,
      riskContribution: weights.unresolvedDependencies,
      recommendedRemediation: 'Verify target org installed package versions and resolve external service dependencies.',
      isUnknown: false
    });
    rawScore += weights.unresolvedDependencies;
  }

  // 4. Evaluate Destructive Components
  const destructiveComponents = release.components.filter(c => c.isDestructive || c.action === 'DELETE');
  if (destructiveComponents.length > 0) {
    findings.push({
      id: `RSK-FND-${findings.length + 1}`,
      title: `${destructiveComponents.length} Destructive Component Modification(s)`,
      severity: 'MEDIUM',
      category: 'GOVERNANCE',
      evidence: `Destructive actions detected on: ${destructiveComponents.map(c => c.name).join(', ')}.`,
      riskContribution: weights.destructiveComponents,
      recommendedRemediation: 'Perform schema dependency impact analysis in target org to confirm no active bindings.',
      isUnknown: false
    });
    rawScore += weights.destructiveComponents;
  }

  // 5. Evaluate Security
  if (release.evidence.security.criticalVulnerabilities > 0) {
    findings.push({
      id: `RSK-FND-${findings.length + 1}`,
      title: `${release.evidence.security.criticalVulnerabilities} Critical Security Vulnerability Detected`,
      severity: 'CRITICAL',
      category: 'SECURITY',
      evidence: `${release.evidence.security.criticalVulnerabilities} critical static analysis or SAST vulnerability flagged in code scan.`,
      riskContribution: weights.criticalSecurity,
      recommendedRemediation: 'Resolve critical vulnerabilities (e.g. SOQL injection, hardcoded credentials) immediately.',
      isUnknown: false
    });
    rawScore += weights.criticalSecurity;
  } else if (release.evidence.security.highVulnerabilities > 0) {
    findings.push({
      id: `RSK-FND-${findings.length + 1}`,
      title: `${release.evidence.security.highVulnerabilities} High Security Finding(s)`,
      severity: 'HIGH',
      category: 'SECURITY',
      evidence: `${release.evidence.security.highVulnerabilities} high severity security issues detected in static code analysis.`,
      riskContribution: weights.highSecurity,
      recommendedRemediation: 'Review and remediate high-severity static analysis warnings prior to production release.',
      isUnknown: false
    });
    rawScore += weights.highSecurity;
  }

  // 6. Evaluate Missing Mandatory Evidence
  if (release.evidence.missingEvidenceFields && release.evidence.missingEvidenceFields.length > 0) {
    findings.push({
      id: `RSK-FND-${findings.length + 1}`,
      title: `${release.evidence.missingEvidenceFields.length} Missing Release Evidence Record(s)`,
      severity: 'HIGH',
      category: 'GOVERNANCE',
      evidence: `Missing required governance evidence: ${release.evidence.missingEvidenceFields.join(', ')}.`,
      riskContribution: weights.missingMandatoryEvidence,
      recommendedRemediation: 'Provide verified release evidence artifacts or complete required sign-offs.',
      isUnknown: true
    });
    rawScore += weights.missingMandatoryEvidence;
  }

  // Bound score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, rawScore));
  const level = classifyRiskLevel(finalScore);

  let explanation = '';
  if (findings.length === 0) {
    explanation = 'All automated release gates, tests, dependencies, and environment promotions passed with zero anomalies.';
  } else {
    explanation = `Calculated risk score of ${finalScore}/100 (${level}) driven by ${findings.length} finding(s): ${findings.map(f => f.title).join('; ')}.`;
  }

  return {
    id: `RSK-${release.id}-${Date.now().toString(36)}`,
    releaseId: release.id,
    score: finalScore,
    level,
    findings,
    evaluatedAt: new Date().toISOString(),
    explanation
  };
}
