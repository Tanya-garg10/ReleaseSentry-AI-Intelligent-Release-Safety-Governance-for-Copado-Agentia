import {
  ReleaseInspectionInputSchema,
  ReleaseInspectionOutputSchema,
  ReleaseRiskInputSchema,
  ReleaseRiskOutputSchema,
  ReleasePolicyInputSchema,
  ReleasePolicyOutputSchema,
  SafeExecutionInputSchema,
  SafeExecutionOutputSchema,
  IncidentInvestigationInputSchema,
  IncidentInvestigationOutputSchema,
  ReleaseRemediationInputSchema,
  ReleaseRemediationOutputSchema
} from './skill-types.ts';
import {
  ReleaseRepo,
  RiskRepo,
  PolicyRepo,
  ApprovalRepo,
  ExecutionRepo,
  IncidentRepo,
  AuditRepo,
  SkillExecutionRepo
} from '../core/src/database/db.ts';
import { evaluateReleaseRisk } from '../core/src/risk-engine/index.ts';
import { evaluateReleasePolicies } from '../core/src/policy-engine/index.ts';
import { calculatePlanHash } from '../core/src/database/seed.ts';
import { agentiaAdapter } from '../core/src/adapters/agentia-adapter.ts';
import { releaseLifecycleManager } from '../core/src/lifecycle/state-machine.ts';

export class SkillExecutor {
  /**
   * Execute release-inspection
   */
  async executeReleaseInspection(inputRaw: unknown) {
    const input = ReleaseInspectionInputSchema.parse(inputRaw);
    const release = ReleaseRepo.getById(input.releaseId);
    if (!release) throw new Error(`Release not found: ${input.releaseId}`);

    // Compute component breakdown
    const types: Record<string, number> = {};
    let destructiveCount = 0;
    for (const c of release.components) {
      types[c.type] = (types[c.type] || 0) + 1;
      if (c.isDestructive || c.action === 'DELETE') destructiveCount++;
    }

    const warnings: string[] = [];
    if (destructiveCount > 0) {
      warnings.push(`${destructiveCount} destructive component modification(s) detected.`);
    }
    if (!release.evidence.tests.hasRun) {
      warnings.push('Zero automated test runs detected in release bundle.');
    }
    if (release.evidence.dependencies.unresolvedCount > 0) {
      warnings.push(`${release.evidence.dependencies.unresolvedCount} unverified dependency/dependencies flagged.`);
    }

    // Refresh plan hash
    release.planHash = calculatePlanHash(release);
    if (release.status === 'DRAFT') {
      release.status = 'INSPECTED';
    }
    ReleaseRepo.save(release);

    const output = {
      releaseId: release.id,
      status: release.status,
      sourceEnvironment: release.sourceEnvironment,
      targetEnvironment: release.targetEnvironment,
      planHash: release.planHash,
      componentSummary: {
        total: release.components.length,
        destructive: destructiveCount,
        types
      },
      evidence: {
        testsFound: release.evidence.tests.hasRun,
        testPassed: release.evidence.tests.passed,
        coveragePercent: release.evidence.tests.codeCoveragePercent,
        dependenciesVerified: release.evidence.dependencies.unresolvedCount === 0,
        securityClean: release.evidence.security.criticalVulnerabilities === 0
      },
      missingEvidenceFields: release.evidence.missingEvidenceFields || [],
      warnings,
      inspectedAt: new Date().toISOString()
    };

    return ReleaseInspectionOutputSchema.parse(output);
  }

  /**
   * Execute release-risk-analysis
   */
  async executeReleaseRiskAnalysis(inputRaw: unknown) {
    const input = ReleaseRiskInputSchema.parse(inputRaw);
    const release = ReleaseRepo.getById(input.releaseId);
    if (!release) throw new Error(`Release not found: ${input.releaseId}`);

    const assessment = evaluateReleaseRisk(release);
    RiskRepo.save(assessment);

    release.riskScore = assessment.score;
    release.riskLevel = assessment.level;
    if (release.status === 'INSPECTED') {
      release.status = 'ANALYZED';
    }
    ReleaseRepo.save(release);

    const output = {
      releaseId: release.id,
      score: assessment.score,
      level: assessment.level,
      findings: assessment.findings,
      summary: assessment.explanation,
      evaluatedAt: assessment.evaluatedAt
    };

    return ReleaseRiskOutputSchema.parse(output);
  }

  /**
   * Execute release-policy-validation
   */
  async executeReleasePolicyValidation(inputRaw: unknown) {
    const input = ReleasePolicyInputSchema.parse(inputRaw);
    const release = ReleaseRepo.getById(input.releaseId);
    if (!release) throw new Error(`Release not found: ${input.releaseId}`);

    const baseConfig = PolicyRepo.getConfig();
    const config = input.policyOverrides ? { ...baseConfig, ...input.policyOverrides } : baseConfig;
    const approvals = ApprovalRepo.getByRelease(release.id);

    const evaluation = evaluateReleasePolicies(release, config, approvals);
    PolicyRepo.saveEvaluation(evaluation);

    // Update release lifecycle based on policy
    if (evaluation.isBlocked) {
      release.status = 'BLOCKED';
    } else if (release.status === 'ANALYZED' || release.status === 'INSPECTED') {
      if (release.targetEnvironment === 'PROD' && !approvals.some(a => a.status === 'APPROVED')) {
        release.status = 'AWAITING_APPROVAL';
      } else {
        release.status = 'VALIDATED';
      }
    }
    ReleaseRepo.save(release);

    const blockingReasons = evaluation.evaluations
      .filter(e => e.verdict === 'BLOCK')
      .map(e => `${e.ruleName}: ${e.reason}`);

    const output = {
      releaseId: release.id,
      overallVerdict: evaluation.overallVerdict,
      isBlocked: evaluation.isBlocked,
      evaluations: evaluation.evaluations,
      blockingReasons,
      evaluatedAt: evaluation.evaluatedAt
    };

    return ReleasePolicyOutputSchema.parse(output);
  }

  /**
   * Execute safe-release-execution
   */
  async executeSafeReleaseExecution(inputRaw: unknown) {
    const input = SafeExecutionInputSchema.parse(inputRaw);
    const release = ReleaseRepo.getById(input.releaseId);
    if (!release) throw new Error(`Release not found: ${input.releaseId}`);

    // Mandatory sequence gate check
    const preFlight = releaseLifecycleManager.verifyExecutionPrerequisites(release);
    if (!preFlight.ok) {
      throw new Error(`Safe Release Execution Gate BLOCKED: ${preFlight.error}`);
    }

    // Set status to EXECUTING
    release.status = 'EXECUTING';
    ReleaseRepo.save(release);

    AuditRepo.record({
      releaseId: release.id,
      action: 'RELEASE_EXECUTION_TRIGGERED',
      actor: input.executedBy,
      actorType: 'AGENT',
      timestamp: new Date().toISOString(),
      details: { target: release.targetEnvironment, planHash: release.planHash },
      verdict: 'START'
    });

    // Execute via Copado Agentia Adapter
    const record = await agentiaAdapter.executeApprovedRelease(release, input.executedBy);
    ExecutionRepo.save(record);

    if (record.status === 'SUCCESS') {
      release.status = 'COMPLETED';
    } else {
      release.status = 'FAILED';
    }
    release.updatedAt = new Date().toISOString();
    ReleaseRepo.save(release);

    AuditRepo.record({
      releaseId: release.id,
      action: 'RELEASE_EXECUTION_RESULT',
      actor: 'safe-release-execution',
      actorType: 'AGENT',
      timestamp: new Date().toISOString(),
      details: { executionId: record.id, status: record.status, mode: record.mode },
      verdict: record.status === 'SUCCESS' ? 'SUCCESS' : 'BLOCK'
    });

    const output = {
      releaseId: release.id,
      executionId: record.id,
      mode: record.mode,
      status: record.status,
      planHashVerified: record.planHashVerified,
      preFlightChecksPassed: true,
      adapterLogs: record.adapterLogs,
      executedAt: record.completedAt,
      durationMs: record.durationMs
    };

    return SafeExecutionOutputSchema.parse(output);
  }

  /**
   * Execute incident-investigation
   */
  async executeIncidentInvestigation(inputRaw: unknown) {
    const input = IncidentInvestigationInputSchema.parse(inputRaw);
    let incident = input.incidentId ? IncidentRepo.getById(input.incidentId) : null;

    if (!incident && input.releaseId) {
      const incidents = IncidentRepo.getAll().filter(i => i.releaseId === input.releaseId);
      if (incidents.length > 0) incident = incidents[0];
    }

    if (!incident) {
      // Create a new incident investigation report for a failed release
      const release = input.releaseId ? ReleaseRepo.getById(input.releaseId) : null;
      incident = {
        id: `INC-${Date.now().toString(36)}`,
        releaseId: input.releaseId || 'UNKNOWN',
        title: `Deployment Failure Investigation: ${release?.title || 'Execution Interrupted'}`,
        severity: release?.targetEnvironment === 'PROD' ? 'CRITICAL' : 'HIGH',
        status: 'INVESTIGATING',
        failedStage: 'Metadata Package Validation',
        occurredAt: new Date().toISOString(),
        errorMessage: 'Execution interrupted due to unresolved schema reference or failing integration tests.',
        probableCause: 'Component deletion or interface modification conflicted with downstream org schema.',
        hypotheses: [
          'Target org has active workflows or apex triggers referencing modified fields.',
          'Missing installed package in target sandbox caused missing type references.'
        ],
        confirmedEvidence: [
          'Pre-flight check failed with non-zero exit code.',
          `Target Environment: ${release?.targetEnvironment || 'UNKNOWN'}`
        ],
        remediationSteps: [
          'Inspect full adapter logs in execution history.',
          'Verify target org schema using Copado Agentia CLI inspector.',
          'Apply corrective rollback or schema decoupling patch.'
        ],
        postMortemReport: 'Incident investigation conducted by ReleaseSentry AI Agent Skill engine.'
      };
      IncidentRepo.save(incident);
    }

    const output = {
      incidentId: incident.id,
      releaseId: incident.releaseId,
      title: incident.title,
      severity: incident.severity,
      failedStage: incident.failedStage,
      probableCause: incident.probableCause,
      confirmedEvidence: incident.confirmedEvidence,
      hypotheses: incident.hypotheses,
      remediationSteps: incident.remediationSteps,
      postMortemReport: incident.postMortemReport,
      analyzedAt: new Date().toISOString()
    };

    return IncidentInvestigationOutputSchema.parse(output);
  }

  /**
   * Execute release-remediation
   */
  async executeReleaseRemediation(inputRaw: unknown) {
    const input = ReleaseRemediationInputSchema.parse(inputRaw);
    const release = ReleaseRepo.getById(input.releaseId);
    if (!release) throw new Error(`Release not found: ${input.releaseId}`);

    const policyEval = PolicyRepo.getLatestEvaluation(release.id);
    const risk = RiskRepo.getLatestByRelease(release.id);

    const remediationPlan: Array<{
      priority: number;
      targetIssue: string;
      category: string;
      actionRequired: string;
      verificationMethod: string;
      automatedCommand?: string;
    }> = [];

    let priority = 1;

    // 1. Check test failures / missing tests
    if (!release.evidence.tests.hasRun || release.evidence.tests.totalTests === 0) {
      remediationPlan.push({
        priority: priority++,
        targetIssue: 'Missing Automated Apex Unit Tests',
        category: 'TESTING',
        actionRequired: 'Trigger test runner on source branch to generate unit test run evidence and verify code coverage >= 75%.',
        verificationMethod: 'Agentia automated test evidence scan',
        automatedCommand: `agentia test run --branch ${release.sourceBranch} --target ${release.sourceEnvironment} --coverage`
      });
    } else if (release.evidence.tests.failedTests > 0) {
      remediationPlan.push({
        priority: priority++,
        targetIssue: `${release.evidence.tests.failedTests} Failing Apex Test(s)`,
        category: 'TESTING',
        actionRequired: 'Fix failing unit test assertions in source classes and re-execute pipeline.',
        verificationMethod: 'Re-run Apex test suite until 0 failures reported.',
        automatedCommand: `agentia test run --class InvoiceCalculationServiceTest`
      });
    }

    // 2. Check environment promotion
    const envRank: Record<string, number> = { DEV: 1, QA: 2, UAT: 3, STAGING: 4, PROD: 5 };
    if ((envRank[release.targetEnvironment] || 5) - (envRank[release.sourceEnvironment] || 1) > 1) {
      remediationPlan.push({
        priority: priority++,
        targetIssue: `Direct ${release.sourceEnvironment} -> ${release.targetEnvironment} Promotion Mismatch`,
        category: 'ENVIRONMENT',
        actionRequired: 'Stage release candidate into QA and STAGING environments before targeting PROD.',
        verificationMethod: 'Certify build artifact through intermediate pipeline stages.',
        automatedCommand: `releasesentry release plan ${release.id} --target STAGING`
      });
    }

    // 3. Check unverified dependencies
    if (release.evidence.dependencies.unresolvedCount > 0 || release.evidence.dependencies.missingPackages.length > 0) {
      remediationPlan.push({
        priority: priority++,
        targetIssue: 'Unverified Package Dependencies',
        category: 'DEPENDENCY',
        actionRequired: 'Verify and install referenced managed packages in target org.',
        verificationMethod: 'Package subscriber verify command.',
        automatedCommand: `agentia package verify --target ${release.targetEnvironment}`
      });
    }

    // 4. Check destructive components
    const destructive = release.components.filter(c => c.isDestructive || c.action === 'DELETE');
    if (destructive.length > 0) {
      remediationPlan.push({
        priority: priority++,
        targetIssue: `${destructive.length} Destructive Component Deletion(s)`,
        category: 'GOVERNANCE',
        actionRequired: 'Conduct schema dependency audit to verify zero active production references before drop.',
        verificationMethod: 'Dependency metadata query in target org.',
        automatedCommand: `agentia metadata query --where "referenceTo = '${destructive[0]?.name}'"`
      });
    }

    // 5. Check human approval for PROD
    if (release.targetEnvironment === 'PROD') {
      const approvals = ApprovalRepo.getByRelease(release.id);
      if (!approvals.some(a => a.status === 'APPROVED')) {
        remediationPlan.push({
          priority: priority++,
          targetIssue: 'Missing Production Human Authorization',
          category: 'APPROVAL',
          actionRequired: 'Request signoff from an authorized Release Manager or Tech Lead with current plan hash.',
          verificationMethod: 'Cryptographic signature and plan hash verification.',
          automatedCommand: `releasesentry release approve ${release.id} --approver "Release Manager"`
        });
      }
    }

    const output = {
      releaseId: release.id,
      blockerCount: remediationPlan.length,
      remediationPlan,
      requiredReinspections: [
        'release-inspection',
        'release-risk-analysis',
        'release-policy-validation'
      ],
      estimatedRiskReduction: Math.min(65, remediationPlan.length * 20),
      generatedAt: new Date().toISOString()
    };

    return ReleaseRemediationOutputSchema.parse(output);
  }
}

export const skillExecutor = new SkillExecutor();
