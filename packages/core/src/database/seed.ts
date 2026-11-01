import crypto from 'node:crypto';
import {
  initDatabase,
  ReleaseRepo,
  RiskRepo,
  PolicyRepo,
  ApprovalRepo,
  ExecutionRepo,
  IncidentRepo,
  AuditRepo,
  SkillExecutionRepo,
  DEFAULT_POLICIES,
  db
} from './db.ts';
import { Release, RiskAssessment, Incident, Approval } from '../types/index.ts';

export function calculatePlanHash(release: Partial<Release>): string {
  const content = JSON.stringify({
    id: release.id,
    target: release.targetEnvironment,
    components: release.components?.map(c => `${c.name}:${c.action}:${c.type}`),
    version: release.version
  });
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

export function seedDatabase(force = false) {
  initDatabase();

  // Initialize policies if not set
  PolicyRepo.saveConfig(DEFAULT_POLICIES);

  // Check if releases already exist
  const existing = ReleaseRepo.getAll();
  if (existing.length > 0 && !force) {
    return; // Already seeded
  }

  if (force) {
    db.exec(`
      DELETE FROM risk_assessments;
      DELETE FROM policy_evaluations;
      DELETE FROM approvals;
      DELETE FROM execution_records;
      DELETE FROM incidents;
      DELETE FROM audit_events;
      DELETE FROM skill_executions;
      DELETE FROM releases;
    `);
  }

  const now = new Date();
  const isoNow = now.toISOString();
  const pastHours = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
  const futureHours = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();

  // Standout Release RLS-104
  const rls104: Release = {
    id: 'RLS-104',
    title: 'Q4 Global Billing Engine & Tiered Pricing',
    description: 'Major refactor of multi-currency invoice calculation and ledger sync flows for enterprise tiers.',
    projectName: 'FinOps Core',
    sourceBranch: 'feature/finops-tier-pricing',
    sourceEnvironment: 'DEV',
    targetEnvironment: 'PROD',
    status: 'BLOCKED',
    version: 'v4.2.0',
    planHash: '',
    createdAt: pastHours(4),
    updatedAt: pastHours(1),
    tags: ['billing', 'apex', 'high-impact', 'financial'],
    components: [
      { name: 'InvoiceCalculationService', type: 'ApexClass', action: 'MODIFY', isDestructive: false, linesChanged: 420 },
      { name: 'SubscriptionLedgerEntry__c', type: 'CustomObject', action: 'ADD', isDestructive: false, linesChanged: 85 },
      { name: 'Billing_Auto_Close_Flow', type: 'Flow', action: 'MODIFY', isDestructive: false, linesChanged: 110 },
      { name: 'LegacyDiscountRate__c', type: 'CustomObject', action: 'DELETE', isDestructive: true, linesChanged: 45 },
      { name: 'BillingDashboardView', type: 'LightningComponent', action: 'MODIFY', isDestructive: false, linesChanged: 140 }
    ],
    evidence: {
      tests: {
        hasRun: false,
        passed: false,
        totalTests: 0,
        failedTests: 0,
        codeCoveragePercent: 0,
        missingEvidenceFields: ['apex_unit_test_run', 'automated_regression_suite']
      } as any,
      dependencies: {
        unresolvedCount: 1,
        circularCount: 0,
        missingPackages: ['BillingConnectorPackage v3.2 (unverified)'],
        externalServicesVerified: false
      },
      security: {
        criticalVulnerabilities: 0,
        highVulnerabilities: 1,
        secretLeaksDetected: false,
        compliancePassed: false
      },
      environmentValidated: false,
      missingEvidenceFields: [
        'Automated Apex Unit Test Report',
        'Staging Environment Verification Signoff',
        'FinOps Architecture Review Record',
        'Dependency Compatibility Attestation'
      ]
    },
    riskScore: 88,
    riskLevel: 'CRITICAL'
  };
  rls104.planHash = calculatePlanHash(rls104);

  // Other 7 realistic releases
  const rls101: Release = {
    id: 'RLS-101',
    title: 'Customer Portal Case Management Enhancements',
    description: 'Streamlined case submission widget and automated triage routing rules.',
    projectName: 'ServiceCloud',
    sourceBranch: 'release/sprint-44-portal',
    sourceEnvironment: 'UAT',
    targetEnvironment: 'STAGING',
    status: 'APPROVED',
    version: 'v2.18.0',
    planHash: '',
    createdAt: pastHours(24),
    updatedAt: pastHours(3),
    tags: ['service-cloud', 'lwc', 'case-triage'],
    components: [
      { name: 'CaseSubmissionController', type: 'ApexClass', action: 'MODIFY', isDestructive: false, linesChanged: 85 },
      { name: 'CasePortalView', type: 'LightningComponent', action: 'MODIFY', isDestructive: false, linesChanged: 112 },
      { name: 'CasePriorityRouting', type: 'Flow', action: 'MODIFY', isDestructive: false, linesChanged: 40 }
    ],
    evidence: {
      tests: {
        hasRun: true,
        passed: true,
        totalTests: 48,
        failedTests: 0,
        codeCoveragePercent: 91,
        testReportUrl: 'https://copado.internal/reports/test-101.json',
        executionTimestamp: pastHours(4)
      },
      dependencies: {
        unresolvedCount: 0,
        circularCount: 0,
        missingPackages: [],
        externalServicesVerified: true
      },
      security: {
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        secretLeaksDetected: false,
        compliancePassed: true
      },
      environmentValidated: true,
      missingEvidenceFields: []
    },
    riskScore: 18,
    riskLevel: 'LOW'
  };
  rls101.planHash = calculatePlanHash(rls101);

  const rls102: Release = {
    id: 'RLS-102',
    title: 'PCI-DSS Stripe Webhook Signature Hotfix',
    description: 'Critical patch updating HMAC SHA-256 signature validation on incoming payment events.',
    projectName: 'FinOps Core',
    sourceBranch: 'hotfix/stripe-hmac-v2',
    sourceEnvironment: 'STAGING',
    targetEnvironment: 'PROD',
    status: 'COMPLETED',
    version: 'v4.1.2',
    planHash: '',
    createdAt: pastHours(48),
    updatedAt: pastHours(36),
    tags: ['hotfix', 'security', 'payments'],
    components: [
      { name: 'StripeWebhookHandler', type: 'ApexClass', action: 'MODIFY', isDestructive: false, linesChanged: 34 }
    ],
    evidence: {
      tests: {
        hasRun: true,
        passed: true,
        totalTests: 16,
        failedTests: 0,
        codeCoveragePercent: 98,
        testReportUrl: 'https://copado.internal/reports/test-102.json',
        executionTimestamp: pastHours(40)
      },
      dependencies: {
        unresolvedCount: 0,
        circularCount: 0,
        missingPackages: [],
        externalServicesVerified: true
      },
      security: {
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        secretLeaksDetected: false,
        compliancePassed: true
      },
      environmentValidated: true,
      missingEvidenceFields: []
    },
    riskScore: 12,
    riskLevel: 'LOW'
  };
  rls102.planHash = calculatePlanHash(rls102);

  const rls103: Release = {
    id: 'RLS-103',
    title: 'Nightly Inventory Batch Harmonizer',
    description: 'Bulk nightly sync across ERP and CRM warehouse stock records.',
    projectName: 'SupplyChain',
    sourceBranch: 'feature/erp-stock-sync',
    sourceEnvironment: 'DEV',
    targetEnvironment: 'QA',
    status: 'BLOCKED',
    version: 'v1.9.0',
    planHash: '',
    createdAt: pastHours(18),
    updatedAt: pastHours(6),
    tags: ['erp', 'batch', 'inventory'],
    components: [
      { name: 'InventorySyncBatchJob', type: 'ApexClass', action: 'MODIFY', isDestructive: false, linesChanged: 310 },
      { name: 'WarehouseItemLedger__c', type: 'CustomObject', action: 'MODIFY', isDestructive: false, linesChanged: 25 }
    ],
    evidence: {
      tests: {
        hasRun: true,
        passed: false,
        totalTests: 32,
        failedTests: 4,
        codeCoveragePercent: 58,
        testReportUrl: 'https://copado.internal/reports/test-103.json',
        executionTimestamp: pastHours(8)
      },
      dependencies: {
        unresolvedCount: 0,
        circularCount: 0,
        missingPackages: [],
        externalServicesVerified: false
      },
      security: {
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        secretLeaksDetected: false,
        compliancePassed: true
      },
      environmentValidated: true,
      missingEvidenceFields: []
    },
    riskScore: 68,
    riskLevel: 'HIGH'
  };
  rls103.planHash = calculatePlanHash(rls103);

  const rls105: Release = {
    id: 'RLS-105',
    title: 'Marketing Cloud Lead Enrichment Connector',
    description: 'Real-time webhook and audience segmentation sync for email nurturing sequences.',
    projectName: 'GrowthOps',
    sourceBranch: 'feature/marketing-sync-v1',
    sourceEnvironment: 'QA',
    targetEnvironment: 'UAT',
    status: 'AWAITING_APPROVAL',
    version: 'v3.4.0',
    planHash: '',
    createdAt: pastHours(12),
    updatedAt: pastHours(2),
    tags: ['marketing', 'lead-gen', 'integrations'],
    components: [
      { name: 'LeadEnrichmentTrigger', type: 'ApexClass', action: 'MODIFY', isDestructive: false, linesChanged: 72 },
      { name: 'MarketingAudienceSync', type: 'Flow', action: 'ADD', isDestructive: false, linesChanged: 95 }
    ],
    evidence: {
      tests: {
        hasRun: true,
        passed: true,
        totalTests: 28,
        failedTests: 0,
        codeCoveragePercent: 84,
        testReportUrl: 'https://copado.internal/reports/test-105.json',
        executionTimestamp: pastHours(3)
      },
      dependencies: {
        unresolvedCount: 0,
        circularCount: 0,
        missingPackages: [],
        externalServicesVerified: true
      },
      security: {
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        secretLeaksDetected: false,
        compliancePassed: true
      },
      environmentValidated: true,
      missingEvidenceFields: []
    },
    riskScore: 32,
    riskLevel: 'MEDIUM'
  };
  rls105.planHash = calculatePlanHash(rls105);

  const rls106: Release = {
    id: 'RLS-106',
    title: 'Apex Security & Sharing Rule Hardening',
    description: 'Enforce WITH SECURITY_ENFORCED across all custom SOQL queries in REST controllers.',
    projectName: 'SecOps',
    sourceBranch: 'security/with-sharing-audit',
    sourceEnvironment: 'UAT',
    targetEnvironment: 'STAGING',
    status: 'COMPLETED',
    version: 'v5.0.1',
    planHash: '',
    createdAt: pastHours(72),
    updatedAt: pastHours(50),
    tags: ['security', 'compliance', 'soql'],
    components: [
      { name: 'AccountRESTController', type: 'ApexClass', action: 'MODIFY', isDestructive: false, linesChanged: 96 },
      { name: 'ContactSearchService', type: 'ApexClass', action: 'MODIFY', isDestructive: false, linesChanged: 60 }
    ],
    evidence: {
      tests: {
        hasRun: true,
        passed: true,
        totalTests: 64,
        failedTests: 0,
        codeCoveragePercent: 95,
        testReportUrl: 'https://copado.internal/reports/test-106.json',
        executionTimestamp: pastHours(55)
      },
      dependencies: {
        unresolvedCount: 0,
        circularCount: 0,
        missingPackages: [],
        externalServicesVerified: true
      },
      security: {
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        secretLeaksDetected: false,
        compliancePassed: true
      },
      environmentValidated: true,
      missingEvidenceFields: []
    },
    riskScore: 8,
    riskLevel: 'LOW'
  };
  rls106.planHash = calculatePlanHash(rls106);

  const rls107: Release = {
    id: 'RLS-107',
    title: 'Opportunity Split Schema Deprecation',
    description: 'Dropping legacy commission fields and rerouting revenue attribution to FinOps ledger.',
    projectName: 'SalesRev',
    sourceBranch: 'release/opp-split-cleanup',
    sourceEnvironment: 'STAGING',
    targetEnvironment: 'PROD',
    status: 'FAILED',
    version: 'v3.0.0',
    planHash: '',
    createdAt: pastHours(30),
    updatedAt: pastHours(10),
    tags: ['destructive', 'sales', 'schema'],
    components: [
      { name: 'Legacy_Commission_Rate__c', type: 'CustomObject', action: 'DELETE', isDestructive: true, linesChanged: 10 },
      { name: 'CommissionRecalculationHandler', type: 'ApexClass', action: 'MODIFY', isDestructive: false, linesChanged: 180 }
    ],
    evidence: {
      tests: {
        hasRun: true,
        passed: false,
        totalTests: 55,
        failedTests: 2,
        codeCoveragePercent: 71,
        testReportUrl: 'https://copado.internal/reports/test-107.json',
        executionTimestamp: pastHours(12)
      },
      dependencies: {
        unresolvedCount: 2,
        circularCount: 0,
        missingPackages: ['External BI Sync Connector dependency unmapped'],
        externalServicesVerified: false
      },
      security: {
        criticalVulnerabilities: 0,
        highVulnerabilities: 1,
        secretLeaksDetected: false,
        compliancePassed: false
      },
      environmentValidated: true,
      missingEvidenceFields: []
    },
    riskScore: 78,
    riskLevel: 'CRITICAL'
  };
  rls107.planHash = calculatePlanHash(rls107);

  const rls108: Release = {
    id: 'RLS-108',
    title: 'Omnichannel Agent Skill-Based Chat Routing',
    description: 'Dynamic agent presence detection and customer sentiment scoring prior to queue allocation.',
    projectName: 'ServiceCloud',
    sourceBranch: 'feature/omnichannel-sentiment',
    sourceEnvironment: 'DEV',
    targetEnvironment: 'DEV',
    status: 'DRAFT',
    version: 'v1.1.0',
    planHash: '',
    createdAt: pastHours(5),
    updatedAt: pastHours(2),
    tags: ['omnichannel', 'service-cloud', 'routing'],
    components: [
      { name: 'SentimentQueueRoutingRule', type: 'Flow', action: 'ADD', isDestructive: false, linesChanged: 160 },
      { name: 'AgentCapacityResolver', type: 'ApexClass', action: 'ADD', isDestructive: false, linesChanged: 85 }
    ],
    evidence: {
      tests: {
        hasRun: false,
        passed: false,
        totalTests: 0,
        failedTests: 0,
        codeCoveragePercent: 0,
        missingEvidenceFields: ['dev_local_test_run']
      } as any,
      dependencies: {
        unresolvedCount: 0,
        circularCount: 0,
        missingPackages: [],
        externalServicesVerified: false
      },
      security: {
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        secretLeaksDetected: false,
        compliancePassed: true
      },
      environmentValidated: true,
      missingEvidenceFields: ['Unit test run in DEV']
    },
    riskScore: 35,
    riskLevel: 'MEDIUM'
  };
  rls108.planHash = calculatePlanHash(rls108);

  const allReleases = [rls104, rls101, rls102, rls103, rls105, rls106, rls107, rls108];
  for (const r of allReleases) {
    ReleaseRepo.save(r);
  }

  // Seed risk assessment for RLS-104
  const risk104: RiskAssessment = {
    id: 'RSK-104',
    releaseId: 'RLS-104',
    score: 88,
    level: 'CRITICAL',
    evaluatedAt: pastHours(1),
    explanation: 'Release RLS-104 exhibits critical risk due to missing automated test evidence, direct promotion from DEV to PROD bypassing QA/STAGING, destructive component deletion, and unverified package dependencies.',
    findings: [
      {
        id: 'FND-104-1',
        title: 'Missing Automated Apex Unit Test Suite Evidence',
        severity: 'CRITICAL',
        category: 'TESTING',
        evidence: 'No automated test run execution record or code coverage report found in release payload.',
        riskContribution: 35,
        recommendedRemediation: 'Execute Copado Agentia automated test runner on source branch and achieve >= 75% code coverage.',
        isUnknown: true
      },
      {
        id: 'FND-104-2',
        title: 'Tier-Skipping Environment Mismatch (DEV -> PROD)',
        severity: 'HIGH',
        category: 'ENVIRONMENT',
        evidence: 'Source environment DEV attempts direct deployment to PROD without intermediate QA or STAGING promotion.',
        riskContribution: 25,
        recommendedRemediation: 'Promote and certify release build through QA and STAGING environments before requesting PROD cutover.',
        isUnknown: false
      },
      {
        id: 'FND-104-3',
        title: 'Unverified Third-Party Package Dependency',
        severity: 'HIGH',
        category: 'DEPENDENCY',
        evidence: 'Referenced package "BillingConnectorPackage v3.2" is unverified and missing checksum verification in target org.',
        riskContribution: 18,
        recommendedRemediation: 'Verify and install BillingConnectorPackage v3.2 in target environment or remove external dependency.',
        isUnknown: false
      },
      {
        id: 'FND-104-4',
        title: 'Unshielded Destructive Component Deletion',
        severity: 'MEDIUM',
        category: 'GOVERNANCE',
        evidence: 'Component LegacyDiscountRate__c marked for DELETE with potential downstream schema dependencies.',
        riskContribution: 10,
        recommendedRemediation: 'Verify zero active references to LegacyDiscountRate__c in production or stage a soft-deprecation period.',
        isUnknown: false
      }
    ]
  };
  RiskRepo.save(risk104);

  // Seed Policy Evaluation for RLS-104
  PolicyRepo.saveEvaluation({
    id: 'POL-104',
    releaseId: 'RLS-104',
    overallVerdict: 'BLOCK',
    isBlocked: true,
    evaluatedAt: pastHours(1),
    evaluations: [
      {
        ruleId: 'productionRequiresApproval',
        ruleName: 'Production Requires Approval',
        verdict: 'BLOCK',
        reason: 'Target environment is PROD but no approved human authorization record exists.',
        details: 'Mandatory human approval by Release Manager or VP Engineering required before PROD deployment.'
      },
      {
        ruleId: 'blockOnFailedTests',
        ruleName: 'Block on Failed or Missing Tests',
        verdict: 'BLOCK',
        reason: 'Zero tests executed or test suite missing.',
        details: 'Code coverage is 0% (Minimum required: 75%).'
      },
      {
        ruleId: 'blockOnCriticalRisk',
        ruleName: 'Block on Critical Risk',
        verdict: 'BLOCK',
        reason: 'Calculated risk score is 88 (CRITICAL), exceeding threshold of 70.',
        details: 'Release safety score must be reduced to MEDIUM or LOW.'
      },
      {
        ruleId: 'blockOnMissingRequiredEvidence',
        ruleName: 'Block on Missing Required Evidence',
        verdict: 'BLOCK',
        reason: '4 mandatory evidence records are missing in payload.',
        details: 'Missing: Automated Apex Unit Test Report, Staging Environment Signoff, FinOps Review.'
      },
      {
        ruleId: 'requireEnvironmentMatch',
        ruleName: 'Sequential Promotion Policy',
        verdict: 'BLOCK',
        reason: 'DEV cannot directly promote into PROD.',
        details: 'Requires promotion through QA and STAGING stages first.'
      }
    ]
  });

  // Seed Approvals
  const approval101: Approval = {
    id: 'APP-101',
    releaseId: 'RLS-101',
    releasePlanHash: rls101.planHash,
    approverId: 'USR-8821',
    approverName: 'Elena Rostova',
    approverEmail: 'elena.rostova@enterprise.internal',
    approverRole: 'Principal Release Architect',
    status: 'APPROVED',
    requestedAt: pastHours(5),
    decisionAt: pastHours(3),
    expiresAt: futureHours(48),
    notes: 'All 48 unit tests passing with 91% coverage. Approved for STAGING validation.'
  };
  ApprovalRepo.save(approval101);

  const approval105: Approval = {
    id: 'APP-105',
    releaseId: 'RLS-105',
    releasePlanHash: rls105.planHash,
    approverId: 'USR-3190',
    approverName: 'Marcus Vance',
    approverEmail: 'marcus.vance@enterprise.internal',
    approverRole: 'QA Engineering Lead',
    status: 'PENDING',
    requestedAt: pastHours(2),
    expiresAt: futureHours(24),
    notes: 'Under review by growth squad. Pending load test attestation.'
  };
  ApprovalRepo.save(approval105);

  // Seed Completed Execution for RLS-102
  ExecutionRepo.save({
    id: 'EXEC-102',
    releaseId: 'RLS-102',
    executedBy: 'Copado Agentia Worker #4 (Approved by Sarah Connor)',
    mode: 'DEMO',
    status: 'SUCCESS',
    startedAt: pastHours(36),
    completedAt: pastHours(36),
    durationMs: 4210,
    adapterLogs: [
      '[Copado Agentia] Initializing release execution for RLS-102',
      '[Copado Agentia] Verifying SHA-256 release plan hash: a8f410c92be1',
      '[Copado Agentia] Validating human approval signature (Sarah Connor - VP Engineering)',
      '[Copado Agentia] Deploying ApexClass StripeWebhookHandler (MODIFY)',
      '[Copado Agentia] Running targeted unit tests: StripeWebhookHandlerTest (16 passed)',
      '[Copado Agentia] Deployment verified successfully in target PROD org.'
    ],
    planHashVerified: true
  });

  // Seed Incident for RLS-107
  const inc107: Incident = {
    id: 'INC-901',
    releaseId: 'RLS-107',
    title: 'Deployment Failure: Field Deprecation Broke Opportunity Sync',
    severity: 'CRITICAL',
    status: 'OPEN',
    failedStage: 'Pre-Deployment Schema Validation',
    occurredAt: pastHours(10),
    errorMessage: 'FIELD_INTEGRITY_EXCEPTION: Cannot delete field Legacy_Commission_Rate__c referenced by active BI Analytics external sync webhook and workflow Commission_Attribution_V2.',
    probableCause: 'Attempted hard deletion of custom field with unresolved active metadata references in production.',
    hypotheses: [
      'Field Legacy_Commission_Rate__c was dropped without deprecating downstream BI ETL pipeline.',
      'Active workflow rule Commission_Attribution_V2 still binds to deleted field schema.'
    ],
    confirmedEvidence: [
      'Log snippet: line 44 "Cannot delete field Legacy_Commission_Rate__c referenced by active workflow Commission_Attribution_V2"',
      'Target PROD metadata check confirmed 1 active workflow dependency.'
    ],
    remediationSteps: [
      'Restore Legacy_Commission_Rate__c metadata in release package.',
      'Deploy workflow Commission_Attribution_V2 update to decouple field reference first.',
      'Perform soft-deprecation mark prior to physical schema drop.'
    ],
    postMortemReport: 'Incident INC-901 triggered by RLS-107 deployment attempt. Release blocked by target org schema integrity enforcement. No customer data was corrupted.'
  };
  IncidentRepo.save(inc107);

  // Seed initial audit events
  AuditRepo.record({
    releaseId: 'RLS-104',
    action: 'INSPECTION_COMPLETED',
    actor: 'Agent Skill: release-inspection',
    actorType: 'AGENT',
    timestamp: pastHours(1),
    details: { componentsFound: 5, missingEvidenceCount: 4, destructiveCount: 1 },
    verdict: 'WARNING'
  });

  AuditRepo.record({
    releaseId: 'RLS-104',
    action: 'POLICY_GATE_TRIGGERED',
    actor: 'Agent Skill: release-policy-validation',
    actorType: 'AGENT',
    timestamp: pastHours(1),
    details: { blockedRules: ['productionRequiresApproval', 'blockOnFailedTests', 'blockOnCriticalRisk'], riskScore: 88 },
    verdict: 'BLOCK'
  });

  AuditRepo.record({
    releaseId: 'RLS-102',
    action: 'SAFE_EXECUTION_COMPLETED',
    actor: 'Agent Skill: safe-release-execution',
    actorType: 'AGENT',
    timestamp: pastHours(36),
    details: { durationMs: 4210, mode: 'DEMO', target: 'PROD', planHashVerified: true },
    verdict: 'SUCCESS'
  });

  // Seed initial skill execution records
  SkillExecutionRepo.record({
    id: 'SKX-001',
    skillId: 'release-inspection',
    skillName: 'Release Inspection',
    releaseId: 'RLS-104',
    triggeredBy: 'Agentia Orchestration Daemon',
    startedAt: pastHours(1),
    completedAt: pastHours(1),
    status: 'SUCCESS',
    inputs: { releaseId: 'RLS-104', deepScan: true },
    outputs: {
      components: 5,
      missingEvidence: ['Apex unit tests', 'Signoff'],
      destructive: 1
    },
    durationMs: 420
  });

  SkillExecutionRepo.record({
    id: 'SKX-002',
    skillId: 'release-risk-analysis',
    skillName: 'Release Risk Analysis',
    releaseId: 'RLS-104',
    triggeredBy: 'Agentia Orchestration Daemon',
    startedAt: pastHours(1),
    completedAt: pastHours(1),
    status: 'SUCCESS',
    inputs: { releaseId: 'RLS-104' },
    outputs: {
      score: 88,
      level: 'CRITICAL',
      findingCount: 4
    },
    durationMs: 650
  });
}
