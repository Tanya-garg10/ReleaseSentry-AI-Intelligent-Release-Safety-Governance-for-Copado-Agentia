import { skillRegistry } from './registry.ts';
import { ReleaseRepo, ApprovalRepo, PolicyRepo } from '../core/src/database/db.ts';

export interface WorkflowStepResult {
  step: number;
  skillId: string;
  skillName: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  output: any;
  explanation: string;
}

export interface ReleaseReadinessReport {
  releaseId: string;
  overallStatus: 'SAFE' | 'BLOCKED' | 'REQUIRES_APPROVAL' | 'HIGH_RISK';
  summary: string;
  steps: WorkflowStepResult[];
  inspection: any;
  risk: any;
  policy: any;
  remediation?: any;
  approvalStatus: string;
  canExecute: boolean;
  generatedAt: string;
}

export class AgentSkillsOrchestrator {
  /**
   * Run end-to-end inspection, risk analysis, and policy validation for a release
   */
  async assessReleaseReadiness(releaseId: string, actor = 'Agentia Orchestration Pipeline'): Promise<ReleaseReadinessReport> {
    const release = ReleaseRepo.getById(releaseId);
    if (!release) {
      throw new Error(`Release not found: ${releaseId}`);
    }

    const steps: WorkflowStepResult[] = [];

    // Step 1: Release Inspection
    const inspectStart = Date.now();
    const inspectResult = await skillRegistry.executeSkill(
      'release-inspection',
      { releaseId, deepScan: true },
      actor
    );
    steps.push({
      step: 1,
      skillId: 'release-inspection',
      skillName: 'Release Inspection',
      status: 'SUCCESS',
      durationMs: inspectResult.durationMs,
      output: inspectResult.output,
      explanation: `Inspected release ${releaseId}: Found ${inspectResult.output.componentSummary.total} components, ${inspectResult.output.missingEvidenceFields.length} missing evidence items.`
    });

    // Step 2: Release Risk Analysis
    const riskStart = Date.now();
    const riskResult = await skillRegistry.executeSkill(
      'release-risk-analysis',
      { releaseId, inspectionResult: inspectResult.output },
      actor
    );
    steps.push({
      step: 2,
      skillId: 'release-risk-analysis',
      skillName: 'Release Risk Analysis',
      status: 'SUCCESS',
      durationMs: riskResult.durationMs,
      output: riskResult.output,
      explanation: `Calculated explainable risk score: ${riskResult.output.score}/100 (${riskResult.output.level}) with ${riskResult.output.findings.length} finding(s).`
    });

    // Step 3: Release Policy Validation
    const policyStart = Date.now();
    const policyResult = await skillRegistry.executeSkill(
      'release-policy-validation',
      { releaseId },
      actor
    );
    steps.push({
      step: 3,
      skillId: 'release-policy-validation',
      skillName: 'Release Policy Validation',
      status: 'SUCCESS',
      durationMs: policyResult.durationMs,
      output: policyResult.output,
      explanation: `Evaluated governance policies: Verdict is ${policyResult.output.overallVerdict} (Blocked: ${policyResult.output.isBlocked}).`
    });

    // Step 4: If blocked or high risk, automatically invoke Release Remediation
    let remediationResult: any = null;
    if (policyResult.output.isBlocked || riskResult.output.level === 'CRITICAL' || riskResult.output.level === 'HIGH') {
      const remResult = await skillRegistry.executeSkill(
        'release-remediation',
        { releaseId },
        actor
      );
      remediationResult = remResult.output;
      steps.push({
        step: 4,
        skillId: 'release-remediation',
        skillName: 'Release Remediation',
        status: 'SUCCESS',
        durationMs: remResult.durationMs,
        output: remResult.output,
        explanation: `Generated ${remResult.output.blockerCount} prioritized remediation action(s) to unblock release.`
      });
    }

    // Determine overall status
    let overallStatus: 'SAFE' | 'BLOCKED' | 'REQUIRES_APPROVAL' | 'HIGH_RISK' = 'SAFE';
    let canExecute = false;

    const approvals = ApprovalRepo.getByRelease(releaseId);
    const validApproval = approvals.find(a => a.status === 'APPROVED');
    const approvalStatus = validApproval ? `Approved by ${validApproval.approverName}` : 'Pending Human Approval';

    if (policyResult.output.isBlocked) {
      overallStatus = 'BLOCKED';
    } else if (release.targetEnvironment === 'PROD' && !validApproval) {
      overallStatus = 'REQUIRES_APPROVAL';
    } else if (riskResult.output.level === 'HIGH' || riskResult.output.level === 'CRITICAL') {
      overallStatus = 'HIGH_RISK';
    } else {
      overallStatus = 'SAFE';
      canExecute = true;
    }

    let summary = '';
    if (overallStatus === 'BLOCKED') {
      summary = `Release ${releaseId} is BLOCKED by organizational policy gates. Blockers include: ${policyResult.output.blockingReasons.join('; ')}. Consult remediation plan to resolve.`;
    } else if (overallStatus === 'REQUIRES_APPROVAL') {
      summary = `Release ${releaseId} passed all technical and automated safety checks, but is held at the Production Human Authorization gate awaiting signoff.`;
    } else if (overallStatus === 'HIGH_RISK') {
      summary = `Release ${releaseId} evaluated with elevated risk (${riskResult.output.score}/100). Review high-severity findings before proceeding.`;
    } else {
      summary = `Release ${releaseId} is verified SAFE for execution in ${release.targetEnvironment}. All 3 agent skills certified readiness.`;
    }

    return {
      releaseId,
      overallStatus,
      summary,
      steps,
      inspection: inspectResult.output,
      risk: riskResult.output,
      policy: policyResult.output,
      remediation: remediationResult,
      approvalStatus,
      canExecute,
      generatedAt: new Date().toISOString()
    };
  }
}

export const agentSkillsOrchestrator = new AgentSkillsOrchestrator();
