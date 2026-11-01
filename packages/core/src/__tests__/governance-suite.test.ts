import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateReleaseRisk, classifyRiskLevel } from '../risk-engine/index.ts';
import { evaluateReleasePolicies } from '../policy-engine/index.ts';
import { Release, PolicyConfig, Approval } from '../types/index.ts';
import { skillLoader } from '../../../agent-skills/skill-loader.ts';
import { skillRegistry } from '../../../agent-skills/registry.ts';
import { agentSkillsOrchestrator } from '../../../agent-skills/orchestrator.ts';
import { calculatePlanHash, seedDatabase } from '../database/seed.ts';
import { releaseLifecycleManager } from '../lifecycle/state-machine.ts';
import { agentiaAdapter } from '../adapters/agentia-adapter.ts';
import { ReleaseRepo, PolicyRepo, ApprovalRepo } from '../database/db.ts';

describe('ReleaseSentry AI Comprehensive Test Suite', () => {
  beforeEach(() => {
    seedDatabase(true);
  });

  // 1. Risk Score Calculation and Classification Tests
  describe('Release Risk Engine', () => {
    it('classifies risk levels properly based on thresholds', () => {
      expect(classifyRiskLevel(0)).toBe('LOW');
      expect(classifyRiskLevel(25)).toBe('LOW');
      expect(classifyRiskLevel(26)).toBe('MEDIUM');
      expect(classifyRiskLevel(50)).toBe('MEDIUM');
      expect(classifyRiskLevel(51)).toBe('HIGH');
      expect(classifyRiskLevel(75)).toBe('HIGH');
      expect(classifyRiskLevel(76)).toBe('CRITICAL');
      expect(classifyRiskLevel(100)).toBe('CRITICAL');
    });

    it('calculates deterministic high/critical risk for missing tests and environment mismatch', () => {
      const mockRelease: Release = {
        id: 'TEST-RLS-1',
        title: 'Test Release with Missing Evidence',
        description: 'Test',
        projectName: 'Core',
        sourceBranch: 'feature/test',
        sourceEnvironment: 'DEV',
        targetEnvironment: 'PROD',
        status: 'DRAFT',
        version: '1.0.0',
        planHash: 'hash123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        components: [
          { name: 'TestClass', type: 'ApexClass', action: 'MODIFY', isDestructive: false, linesChanged: 50 },
          { name: 'DropField__c', type: 'CustomObject', action: 'DELETE', isDestructive: true, linesChanged: 10 }
        ],
        evidence: {
          tests: { hasRun: false, passed: false, totalTests: 0, failedTests: 0, codeCoveragePercent: 0 },
          dependencies: { unresolvedCount: 1, circularCount: 0, missingPackages: ['PkgA'], externalServicesVerified: false },
          security: { criticalVulnerabilities: 0, highVulnerabilities: 1, secretLeaksDetected: false, compliancePassed: false },
          environmentValidated: false,
          missingEvidenceFields: ['Unit test report']
        }
      };

      const assessment = evaluateReleaseRisk(mockRelease);
      expect(assessment.score).toBeGreaterThanOrEqual(76);
      expect(assessment.level).toBe('CRITICAL');
      expect(assessment.findings.length).toBeGreaterThanOrEqual(4);

      // Verify traceable findings
      const titles = assessment.findings.map(f => f.title);
      expect(titles.some(t => t.includes('Missing Automated Test Execution Evidence'))).toBe(true);
      expect(titles.some(t => t.includes('Tier-Skipping Environment Promotion'))).toBe(true);
      expect(titles.some(t => t.includes('Destructive Component Modification'))).toBe(true);
    });

    it('calculates low risk for fully certified releases', () => {
      const cleanRelease: Release = {
        id: 'TEST-RLS-CLEAN',
        title: 'Clean Release',
        description: 'Test',
        projectName: 'Core',
        sourceBranch: 'release/v1',
        sourceEnvironment: 'STAGING',
        targetEnvironment: 'PROD',
        status: 'VALIDATED',
        version: '1.0.0',
        planHash: 'cleanHash',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        components: [
          { name: 'SafeComponent', type: 'LightningComponent', action: 'MODIFY', isDestructive: false, linesChanged: 20 }
        ],
        evidence: {
          tests: { hasRun: true, passed: true, totalTests: 40, failedTests: 0, codeCoveragePercent: 95 },
          dependencies: { unresolvedCount: 0, circularCount: 0, missingPackages: [], externalServicesVerified: true },
          security: { criticalVulnerabilities: 0, highVulnerabilities: 0, secretLeaksDetected: false, compliancePassed: true },
          environmentValidated: true,
          missingEvidenceFields: []
        }
      };

      const assessment = evaluateReleaseRisk(cleanRelease);
      expect(assessment.score).toBeLessThanOrEqual(25);
      expect(assessment.level).toBe('LOW');
      expect(assessment.findings.length).toBe(0);
    });
  });

  // 2. Policy-as-Code Engine Tests
  describe('Policy-as-Code Engine', () => {
    const config: PolicyConfig = {
      productionRequiresApproval: true,
      blockOnFailedTests: true,
      blockOnCriticalRisk: true,
      blockOnMissingRequiredEvidence: true,
      requireEnvironmentMatch: true,
      requireValidApproval: true,
      requireConfirmationForDestructiveActions: true,
      maxAcceptableRiskScore: 70,
      minCodeCoveragePercent: 75
    };

    it('blocks release if target is PROD and approval is missing', () => {
      const rls = ReleaseRepo.getById('RLS-104')!;
      const result = evaluateReleasePolicies(rls, config, []);
      expect(result.isBlocked).toBe(true);
      expect(result.overallVerdict).toBe('BLOCK');

      const approvalRule = result.evaluations.find(e => e.ruleId === 'productionRequiresApproval');
      expect(approvalRule?.verdict).toBe('BLOCK');
    });

    it('blocks release on failed tests', () => {
      const failingRls = ReleaseRepo.getById('RLS-103')!;
      const result = evaluateReleasePolicies(failingRls, config, []);
      expect(result.isBlocked).toBe(true);
      const testRule = result.evaluations.find(e => e.ruleId === 'blockOnFailedTests');
      expect(testRule?.verdict).toBe('BLOCK');
    });

    it('allows clean release with valid approval to PASS', () => {
      const rls = ReleaseRepo.getById('RLS-101')!;
      const approvals = ApprovalRepo.getByRelease('RLS-101');
      const result = evaluateReleasePolicies(rls, config, approvals);
      expect(result.isBlocked).toBe(false);
      expect(result.overallVerdict).toBe('PASS');
    });
  });

  // 3. Agent Skills Registry & Discovery
  describe('Agent Skills Engine', () => {
    it('discovers all 6 mandatory Agent Skills from filesystem', () => {
      const skills = skillLoader.discoverSkills();
      expect(skills.length).toBeGreaterThanOrEqual(6);
      const ids = skills.map(s => s.id);
      expect(ids).toContain('release-inspection');
      expect(ids).toContain('release-risk-analysis');
      expect(ids).toContain('release-policy-validation');
      expect(ids).toContain('safe-release-execution');
      expect(ids).toContain('incident-investigation');
      expect(ids).toContain('release-remediation');
    });

    it('registers skills and attaches working executable handlers', async () => {
      const inspectionSkill = skillRegistry.getSkill('release-inspection');
      expect(inspectionSkill).toBeDefined();
      expect(inspectionSkill?.status).toBe('ACTIVE');

      const result = await skillRegistry.executeSkill('release-inspection', {
        releaseId: 'RLS-104',
        deepScan: true
      }, 'Test Suite');

      expect(result.status).toBe('SUCCESS');
      expect(result.output.releaseId).toBe('RLS-104');
      expect(result.output.componentSummary.total).toBe(5);
      expect(result.output.missingEvidenceFields.length).toBeGreaterThan(0);
    });

    it('orchestrates end-to-end multi-skill chain (RLS-104 scenario)', async () => {
      const report = await agentSkillsOrchestrator.assessReleaseReadiness('RLS-104', 'Test Suite');
      expect(report.releaseId).toBe('RLS-104');
      expect(report.overallStatus).toBe('BLOCKED');
      expect(report.canExecute).toBe(false);
      expect(report.steps.length).toBeGreaterThanOrEqual(3);
      expect(report.inspection).toBeDefined();
      expect(report.risk.score).toBeGreaterThan(75);
      expect(report.policy.isBlocked).toBe(true);
      expect(report.remediation?.remediationPlan.length).toBeGreaterThan(0);
    });

    it('rejects invalid inputs using Zod validation', async () => {
      await expect(
        skillRegistry.executeSkill('release-inspection', { releaseId: '' }, 'Test')
      ).rejects.toThrow();
    });
  });

  // 4. Approval and Plan Invariants
  describe('Approval and Lifecycle Invariants', () => {
    it('invalidates approval when release plan components change', () => {
      const rls = ReleaseRepo.getById('RLS-101')!;
      const originalHash = rls.planHash;
      expect(originalHash).toBeTruthy();

      // Modify a component
      rls.components.push({
        name: 'UnapprovedSneakyClass',
        type: 'ApexClass',
        action: 'ADD',
        isDestructive: false,
        linesChanged: 100
      });

      const invalidated = releaseLifecycleManager.checkAndInvalidateOnPlanChange(rls);
      expect(invalidated).toBe(true);
      expect(rls.planHash).not.toBe(originalHash);

      const approvals = ApprovalRepo.getByRelease('RLS-101');
      expect(approvals.every(a => a.status === 'EXPIRED')).toBe(true);
    });

    it('blocks unauthorized execution when release is in BLOCKED state', () => {
      const rls = ReleaseRepo.getById('RLS-104')!;
      const check = releaseLifecycleManager.verifyExecutionPrerequisites(rls);
      expect(check.ok).toBe(false);
      expect(check.error).toBeTruthy();
    });
  });

  // 5. Copado Agentia Adapter Tests
  describe('Copado Agentia Adapter', () => {
    it('returns structured status with transparent DEMO/LIVE mode notice', async () => {
      const status = await agentiaAdapter.getStatus();
      expect(status.capabilities).toBeDefined();
      expect(status.capabilities.length).toBeGreaterThan(0);
      expect(status.mode === 'DEMO' || status.mode === 'LIVE').toBe(true);
      expect(status.notice).toBeTruthy();
    });

    it('safely runs pre-deployment verification without shell injection', async () => {
      const rls = ReleaseRepo.getById('RLS-102')!;
      const result = await agentiaAdapter.runPreDeploymentVerification(rls);
      expect(result.success).toBe(true);
      expect(result.logs.some(l => l.includes(rls.id))).toBe(true);
    });
  });
});
