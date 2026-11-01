import {
  Release,
  RiskAssessment,
  PolicyEvaluation,
  PolicyConfig,
  Approval,
  Incident,
  AuditEvent,
  AgentSkill,
  SkillExecution,
  SystemStats
} from './types.ts';

const API_BASE = '/api';

export const api = {
  async getStats(): Promise<SystemStats> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to load system stats');
    return res.json();
  },

  async getReleases(): Promise<Release[]> {
    const res = await fetch(`${API_BASE}/releases`);
    if (!res.ok) throw new Error('Failed to load releases');
    return res.json();
  },

  async getRelease(id: string): Promise<{
    release: Release;
    latestRisk: RiskAssessment | null;
    latestPolicy: PolicyEvaluation | null;
    approvals: Approval[];
    executions: any[];
  }> {
    const res = await fetch(`${API_BASE}/releases/${id}`);
    if (!res.ok) throw new Error(`Failed to load release ${id}`);
    return res.json();
  },

  async createRelease(data: Partial<Release>): Promise<Release> {
    const res = await fetch(`${API_BASE}/releases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create release');
    }
    return res.json();
  },

  async updateEvidence(id: string, evidenceData: any): Promise<{ message: string; release: Release }> {
    const res = await fetch(`${API_BASE}/releases/${id}/update-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evidenceData)
    });
    if (!res.ok) throw new Error('Failed to update evidence');
    return res.json();
  },

  async inspectRelease(id: string, deepScan = true): Promise<any> {
    const res = await fetch(`${API_BASE}/releases/${id}/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deepScan })
    });
    if (!res.ok) throw new Error('Inspection failed');
    return res.json();
  },

  async analyzeRisk(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/releases/${id}/analyze-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Risk analysis failed');
    return res.json();
  },

  async validatePolicy(id: string, policyOverrides?: Record<string, boolean>): Promise<any> {
    const res = await fetch(`${API_BASE}/releases/${id}/validate-policy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policyOverrides })
    });
    if (!res.ok) throw new Error('Policy validation failed');
    return res.json();
  },

  async getRemediation(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/releases/${id}/remediate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Remediation calculation failed');
    return res.json();
  },

  async runAllSkillsWorkflow(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/releases/${id}/workflow/run-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Workflow execution failed');
    return res.json();
  },

  async getApprovals(): Promise<Approval[]> {
    const res = await fetch(`${API_BASE}/approvals`);
    if (!res.ok) throw new Error('Failed to load approvals');
    return res.json();
  },

  async requestApproval(id: string, approverName: string, notes?: string): Promise<Approval> {
    const res = await fetch(`${API_BASE}/releases/${id}/request-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approverName, notes })
    });
    if (!res.ok) throw new Error('Failed to request approval');
    return res.json();
  },

  async decideApproval(id: string, approverName: string, decision: 'APPROVE' | 'REJECT', notes?: string, approvalId?: string): Promise<Approval> {
    const res = await fetch(`${API_BASE}/releases/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approverName, decision, notes, approvalId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit approval decision');
    }
    return res.json();
  },

  async executeRelease(id: string, executedBy?: string, humanConfirmed = true): Promise<any> {
    const res = await fetch(`${API_BASE}/releases/${id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executedBy, humanConfirmed })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Safe release execution failed');
    }
    return res.json();
  },

  async getSkills(): Promise<AgentSkill[]> {
    const res = await fetch(`${API_BASE}/skills`);
    if (!res.ok) throw new Error('Failed to load skills');
    return res.json();
  },

  async runSkill(skillId: string, params: any): Promise<any> {
    const res = await fetch(`${API_BASE}/skills/${skillId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Skill execution failed');
    }
    return res.json();
  },

  async getSkillHistory(): Promise<SkillExecution[]> {
    const res = await fetch(`${API_BASE}/skills/history`);
    if (!res.ok) throw new Error('Failed to load skill history');
    return res.json();
  },

  async getPolicies(): Promise<PolicyConfig> {
    const res = await fetch(`${API_BASE}/policies`);
    if (!res.ok) throw new Error('Failed to load policies');
    return res.json();
  },

  async updatePolicies(policies: Partial<PolicyConfig>): Promise<PolicyConfig> {
    const res = await fetch(`${API_BASE}/policies`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policies)
    });
    if (!res.ok) throw new Error('Failed to update policies');
    return res.json();
  },

  async getIncidents(): Promise<Incident[]> {
    const res = await fetch(`${API_BASE}/incidents`);
    if (!res.ok) throw new Error('Failed to load incidents');
    return res.json();
  },

  async investigateIncident(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/incidents/${id}/investigate`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Incident investigation failed');
    return res.json();
  },

  async getAudits(): Promise<AuditEvent[]> {
    const res = await fetch(`${API_BASE}/audit`);
    if (!res.ok) throw new Error('Failed to load audit events');
    return res.json();
  },

  async askAI(payload: {
    type: 'RISK_SUMMARY' | 'POLICY_EXPLANATION' | 'REMEDIATION_GUIDANCE' | 'INCIDENT_POSTMORTEM';
    releaseId?: string;
    incidentId?: string;
    userQuery?: string;
  }): Promise<{ explanation: string; provider: 'GEMINI_LLM' | 'DETERMINISTIC_ENGINE' }> {
    const res = await fetch(`${API_BASE}/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('AI Analyst query failed');
    return res.json();
  },

  async resetDemo(): Promise<any> {
    const res = await fetch(`${API_BASE}/system/reset-demo`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to reset demo');
    return res.json();
  }
};
