export type EnvironmentType = 'DEV' | 'QA' | 'UAT' | 'STAGING' | 'PROD';

export type ReleaseStatus =
  | 'DRAFT'
  | 'INSPECTED'
  | 'ANALYZED'
  | 'VALIDATED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PolicyVerdict = 'PASS' | 'WARNING' | 'BLOCK';

export interface ChangedComponent {
  name: string;
  type: 'ApexClass' | 'CustomObject' | 'Flow' | 'LightningComponent' | 'PermissionSet' | 'Layout' | 'Profile' | 'StaticResource';
  action: 'ADD' | 'MODIFY' | 'DELETE';
  isDestructive: boolean;
  linesChanged: number;
}

export interface TestEvidence {
  hasRun: boolean;
  passed: boolean;
  totalTests: number;
  failedTests: number;
  codeCoveragePercent: number;
  testReportUrl?: string;
  executionTimestamp?: string;
}

export interface DependencyEvidence {
  unresolvedCount: number;
  circularCount: number;
  missingPackages: string[];
  externalServicesVerified: boolean;
}

export interface SecurityEvidence {
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  secretLeaksDetected: boolean;
  compliancePassed: boolean;
}

export interface ReleaseEvidence {
  tests: TestEvidence;
  dependencies: DependencyEvidence;
  security: SecurityEvidence;
  environmentValidated: boolean;
  changeValidationHash?: string;
  missingEvidenceFields: string[];
}

export interface Release {
  id: string; // e.g. RLS-104
  title: string;
  description: string;
  projectName: string;
  sourceBranch: string;
  sourceEnvironment: EnvironmentType;
  targetEnvironment: EnvironmentType;
  status: ReleaseStatus;
  createdAt: string;
  updatedAt: string;
  planHash: string;
  version: string;
  components: ChangedComponent[];
  evidence: ReleaseEvidence;
  riskScore?: number;
  riskLevel?: RiskLevel;
  tags: string[];
}

export interface RiskFinding {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'TESTING' | 'ENVIRONMENT' | 'DEPENDENCY' | 'SECURITY' | 'APPROVAL' | 'GOVERNANCE';
  evidence: string;
  riskContribution: number;
  recommendedRemediation: string;
  isUnknown: boolean;
}

export interface RiskAssessment {
  id: string;
  releaseId: string;
  score: number; // 0 - 100
  level: RiskLevel;
  findings: RiskFinding[];
  evaluatedAt: string;
  explanation: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'BLOCK' | 'WARNING';
}

export interface PolicyConfig {
  productionRequiresApproval: boolean;
  blockOnFailedTests: boolean;
  blockOnCriticalRisk: boolean;
  blockOnMissingRequiredEvidence: boolean;
  requireEnvironmentMatch: boolean;
  requireValidApproval: boolean;
  requireConfirmationForDestructiveActions: boolean;
  maxAcceptableRiskScore: number;
  minCodeCoveragePercent: number;
}

export interface PolicyEvaluationItem {
  ruleId: string;
  ruleName: string;
  verdict: PolicyVerdict;
  reason: string;
  details: string;
}

export interface PolicyEvaluation {
  id: string;
  releaseId: string;
  overallVerdict: PolicyVerdict;
  isBlocked: boolean;
  evaluations: PolicyEvaluationItem[];
  evaluatedAt: string;
}

export interface Approval {
  id: string;
  releaseId: string;
  releasePlanHash: string;
  approverId: string;
  approverName: string;
  approverEmail: string;
  approverRole: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedAt: string;
  decisionAt?: string;
  expiresAt: string;
  notes?: string;
}

export interface ExecutionRecord {
  id: string;
  releaseId: string;
  executedBy: string;
  mode: 'DEMO' | 'LIVE';
  status: 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  adapterLogs: string[];
  planHashVerified: boolean;
  errorMessage?: string;
}

export interface Incident {
  id: string;
  releaseId: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  failedStage: string;
  occurredAt: string;
  errorMessage: string;
  probableCause: string;
  hypotheses: string[];
  confirmedEvidence: string[];
  remediationSteps: string[];
  postMortemReport?: string;
}

export interface AuditEvent {
  id: string;
  releaseId?: string;
  action: string;
  actor: string;
  actorType: 'AGENT' | 'HUMAN' | 'SYSTEM' | 'CLI' | 'MCP';
  timestamp: string;
  details: Record<string, any>;
  verdict?: string;
}

export interface SkillExecution {
  id: string;
  skillId: string;
  skillName: string;
  releaseId?: string;
  triggeredBy: string;
  startedAt: string;
  completedAt: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  durationMs: number;
  errorMessage?: string;
}
