import { z } from 'zod';

// Release Inspection Schemas
export const ReleaseInspectionInputSchema = z.object({
  releaseId: z.string().min(1),
  deepScan: z.boolean().optional().default(true)
});

export const ReleaseInspectionOutputSchema = z.object({
  releaseId: z.string(),
  status: z.string(),
  sourceEnvironment: z.string(),
  targetEnvironment: z.string(),
  planHash: z.string(),
  componentSummary: z.object({
    total: z.number(),
    destructive: z.number(),
    types: z.record(z.string(), z.number())
  }),
  evidence: z.object({
    testsFound: z.boolean(),
    testPassed: z.boolean(),
    coveragePercent: z.number(),
    dependenciesVerified: z.boolean(),
    securityClean: z.boolean()
  }),
  missingEvidenceFields: z.array(z.string()),
  warnings: z.array(z.string()),
  inspectedAt: z.string()
});

// Release Risk Analysis Schemas
export const ReleaseRiskInputSchema = z.object({
  releaseId: z.string().min(1),
  inspectionResult: z.any().optional()
});

export const ReleaseRiskOutputSchema = z.object({
  releaseId: z.string(),
  score: z.number().min(0).max(100),
  level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  findings: z.array(z.object({
    id: z.string(),
    title: z.string(),
    severity: z.string(),
    category: z.string(),
    evidence: z.string(),
    riskContribution: z.number(),
    recommendedRemediation: z.string(),
    isUnknown: z.boolean()
  })),
  summary: z.string(),
  evaluatedAt: z.string()
});

// Release Policy Validation Schemas
export const ReleasePolicyInputSchema = z.object({
  releaseId: z.string().min(1),
  policyOverrides: z.record(z.string(), z.boolean()).optional()
});

export const ReleasePolicyOutputSchema = z.object({
  releaseId: z.string(),
  overallVerdict: z.enum(['PASS', 'WARNING', 'BLOCK']),
  isBlocked: z.boolean(),
  evaluations: z.array(z.object({
    ruleId: z.string(),
    ruleName: z.string(),
    verdict: z.enum(['PASS', 'WARNING', 'BLOCK']),
    reason: z.string(),
    details: z.string()
  })),
  blockingReasons: z.array(z.string()),
  evaluatedAt: z.string()
});

// Safe Release Execution Schemas
export const SafeExecutionInputSchema = z.object({
  releaseId: z.string().min(1),
  executedBy: z.string().default('Authorized Copado Operator'),
  humanConfirmed: z.boolean().default(false)
});

export const SafeExecutionOutputSchema = z.object({
  releaseId: z.string(),
  executionId: z.string(),
  mode: z.enum(['DEMO', 'LIVE']),
  status: z.enum(['SUCCESS', 'FAILED', 'ROLLED_BACK']),
  planHashVerified: z.boolean(),
  preFlightChecksPassed: z.boolean(),
  adapterLogs: z.array(z.string()),
  executedAt: z.string(),
  durationMs: z.number()
});

// Incident Investigation Schemas
export const IncidentInvestigationInputSchema = z.object({
  incidentId: z.string().optional(),
  releaseId: z.string().optional()
});

export const IncidentInvestigationOutputSchema = z.object({
  incidentId: z.string(),
  releaseId: z.string(),
  title: z.string(),
  severity: z.string(),
  failedStage: z.string(),
  probableCause: z.string(),
  confirmedEvidence: z.array(z.string()),
  hypotheses: z.array(z.string()),
  remediationSteps: z.array(z.string()),
  postMortemReport: z.string().optional(),
  analyzedAt: z.string()
});

// Release Remediation Schemas
export const ReleaseRemediationInputSchema = z.object({
  releaseId: z.string().min(1)
});

export const ReleaseRemediationOutputSchema = z.object({
  releaseId: z.string(),
  blockerCount: z.number(),
  remediationPlan: z.array(z.object({
    priority: z.number(),
    targetIssue: z.string(),
    category: z.string(),
    actionRequired: z.string(),
    verificationMethod: z.string(),
    automatedCommand: z.string().optional()
  })),
  requiredReinspections: z.array(z.string()),
  estimatedRiskReduction: z.number(),
  generatedAt: z.string()
});

export interface AgentSkillMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  author: string;
  skillPath: string;
  markdownDoc: string;
  inputSchemaDescription: string;
  outputSchemaDescription: string;
}

export type SkillInputType = Record<string, any>;
export type SkillOutputType = Record<string, any>;
