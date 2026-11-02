import OpenAI from 'openai';
import { Release, RiskAssessment, PolicyEvaluation, Incident } from '../types/index.ts';

export interface AnalystExplanationRequest {
  type: 'RISK_SUMMARY' | 'POLICY_EXPLANATION' | 'REMEDIATION_GUIDANCE' | 'INCIDENT_POSTMORTEM';
  release?: Release;
  riskAssessment?: RiskAssessment;
  policyEvaluation?: PolicyEvaluation;
  incident?: Incident;
  userQuery?: string;
}

export class AIReleaseAnalyst {
  private aiClient: OpenAI | null = null;

  constructor() {
    if (process.env.FEATHERLESS_API_KEY) {
      try {
        this.aiClient = new OpenAI({
          apiKey: process.env.FEATHERLESS_API_KEY,
          baseURL: 'https://api.featherless.ai/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://releasesentry.ai',
            'X-Title': 'ReleaseSentry AI'
          }
        });
      } catch {
        this.aiClient = null;
      }
    }
  }

  /**
   * Deterministic evidence-grounded explanation engine (offline/fallback)
   */
  private generateDeterministicExplanation(req: AnalystExplanationRequest): string {
    if (req.type === 'RISK_SUMMARY' && req.release && req.riskAssessment) {
      const topFindings = req.riskAssessment.findings
        .map((f, i) => `${i + 1}. [${f.severity}] ${f.title}: ${f.evidence} (Risk +${f.riskContribution})`)
        .join('\n');

      return `### Executive Risk Analysis: ${req.release.id} (${req.release.title})
- **Overall Score**: ${req.riskAssessment.score}/100 (${req.riskAssessment.level} Risk)
- **Target Environment**: ${req.release.targetEnvironment} (Promoted from ${req.release.sourceEnvironment})
- **Evaluated Drivers**:
${topFindings || 'No material risk drivers flagged in release metadata.'}

**Governance Recommendation**:
${req.riskAssessment.score > 70
  ? 'Execution is strictly BLOCKED by risk thresholds. Developers must resolve failing/missing tests and environment discrepancies before requesting re-inspection.'
  : 'Release risk is acceptable. Proceed with standard verification and peer review.'}`;
    }

    if (req.type === 'POLICY_EXPLANATION' && req.policyEvaluation) {
      const blocked = req.policyEvaluation.evaluations.filter(e => e.verdict === 'BLOCK');
      const warnings = req.policyEvaluation.evaluations.filter(e => e.verdict === 'WARNING');

      return `### Policy Gate Verification Summary
- **Overall Verdict**: ${req.policyEvaluation.overallVerdict}
- **Active Enforcements**: ${req.policyEvaluation.evaluations.length} policies evaluated

${blocked.length > 0 ? `**Blocking Violations (${blocked.length})**:\n` + blocked.map(b => `- **${b.ruleName}**: ${b.reason}`).join('\n') : '**Zero Blocking Violations**'}

${warnings.length > 0 ? `\n**Advisory Warnings (${warnings.length})**:\n` + warnings.map(w => `- ${w.ruleName}: ${w.reason}`).join('\n') : ''}

*Invariant Protection: AI Agents and Skills are forbidden from overriding governance blocks.*`;
    }

    if (req.type === 'INCIDENT_POSTMORTEM' && req.incident) {
      return `### Incident Post-Mortem: ${req.incident.id} - ${req.incident.title}
- **Severity**: ${req.incident.severity} | **Status**: ${req.incident.status}
- **Failing Pipeline Stage**: ${req.incident.failedStage}
- **Confirmed Evidence**:
${req.incident.confirmedEvidence.map(e => `  - ${e}`).join('\n')}
- **Probable Root Cause**:
  ${req.incident.probableCause}
- **Immediate Corrective Actions**:
${req.incident.remediationSteps.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`;
    }

    return `ReleaseSentry AI Analyst: Release ${req.release?.id || 'RLS'} is governed under continuous compliance rules. All actions must maintain verified test evidence and authorization traces.`;
  }

  /**
   * Explain release risks, policies, or incidents using Featherless AI or deterministic fallback
   */
  async explain(req: AnalystExplanationRequest): Promise<{ explanation: string; provider: 'FEATHERLESS_LLM' | 'DETERMINISTIC_ENGINE' }> {
    if (!this.aiClient) {
      return {
        explanation: this.generateDeterministicExplanation(req),
        provider: 'DETERMINISTIC_ENGINE'
      };
    }

    try {
      const prompt = `You are ReleaseSentry AI's Senior Release Governance Analyst.
You provide concise, factual, grounded release advice based STRICTLY on real evidence.
NEVER hallucinate, assume, or fabricate test results or approval traces.
NEVER approve releases yourself or override governance blocks.

Context:
Type: ${req.type}
Release ID: ${req.release?.id}
Title: ${req.release?.title}
Target Env: ${req.release?.targetEnvironment}
Source Env: ${req.release?.sourceEnvironment}
Risk Score: ${req.riskAssessment?.score} (${req.riskAssessment?.level})
Findings: ${JSON.stringify(req.riskAssessment?.findings || [])}
Policy Verdict: ${req.policyEvaluation?.overallVerdict}
Blocking Reasons: ${JSON.stringify(req.policyEvaluation?.evaluations.filter(e => e.verdict === 'BLOCK') || [])}
Incident: ${JSON.stringify(req.incident || null)}
User Query: ${req.userQuery || 'Provide an executive governance summary and clear remediation steps.'}

Provide clear, professional, markdown-formatted release governance guidance.`;

      const response = await this.aiClient.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
        messages: [
          {
            role: 'system',
            content: 'You are ReleaseSentry AI\'s Senior Release Governance Analyst. You provide concise, factual, grounded release advice based STRICTLY on real evidence. NEVER hallucinate, assume, or fabricate test results or approval traces. NEVER approve releases yourself or override governance blocks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (text) {
        return {
          explanation: text,
          provider: 'FEATHERLESS_LLM'
        };
      }
    } catch (err) {
      console.warn('Featherless API call fell back to deterministic analyst:', err);
    }

    return {
      explanation: this.generateDeterministicExplanation(req),
      provider: 'DETERMINISTIC_ENGINE'
    };
  }
}

export const aiAnalyst = new AIReleaseAnalyst();
