import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import {
  Release,
  RiskAssessment,
  RiskFinding,
  PolicyConfig,
  PolicyEvaluation,
  Approval,
  ExecutionRecord,
  Incident,
  AuditEvent,
  SkillExecution
} from '../types/index.ts';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'releasesentry.db');
export const db = new DatabaseSync(DB_PATH);

// Initialize schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS releases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      project_name TEXT NOT NULL,
      source_branch TEXT NOT NULL,
      source_environment TEXT NOT NULL,
      target_environment TEXT NOT NULL,
      status TEXT NOT NULL,
      plan_hash TEXT NOT NULL,
      version TEXT NOT NULL,
      components_json TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      risk_score INTEGER,
      risk_level TEXT,
      tags_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS risk_assessments (
      id TEXT PRIMARY KEY,
      release_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      level TEXT NOT NULL,
      findings_json TEXT NOT NULL,
      explanation TEXT NOT NULL,
      evaluated_at TEXT NOT NULL,
      FOREIGN KEY(release_id) REFERENCES releases(id)
    );

    CREATE TABLE IF NOT EXISTS policy_evaluations (
      id TEXT PRIMARY KEY,
      release_id TEXT NOT NULL,
      overall_verdict TEXT NOT NULL,
      is_blocked INTEGER NOT NULL,
      evaluations_json TEXT NOT NULL,
      evaluated_at TEXT NOT NULL,
      FOREIGN KEY(release_id) REFERENCES releases(id)
    );

    CREATE TABLE IF NOT EXISTS policies_config (
      id TEXT PRIMARY KEY,
      config_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      release_id TEXT NOT NULL,
      release_plan_hash TEXT NOT NULL,
      approver_id TEXT NOT NULL,
      approver_name TEXT NOT NULL,
      approver_email TEXT NOT NULL,
      approver_role TEXT NOT NULL,
      status TEXT NOT NULL,
      requested_at TEXT NOT NULL,
      decision_at TEXT,
      expires_at TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY(release_id) REFERENCES releases(id)
    );

    CREATE TABLE IF NOT EXISTS execution_records (
      id TEXT PRIMARY KEY,
      release_id TEXT NOT NULL,
      executed_by TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      adapter_logs_json TEXT NOT NULL,
      plan_hash_verified INTEGER NOT NULL,
      error_message TEXT,
      FOREIGN KEY(release_id) REFERENCES releases(id)
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      release_id TEXT NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      failed_stage TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      error_message TEXT NOT NULL,
      probable_cause TEXT NOT NULL,
      hypotheses_json TEXT NOT NULL,
      confirmed_evidence_json TEXT NOT NULL,
      remediation_steps_json TEXT NOT NULL,
      post_mortem_report TEXT,
      FOREIGN KEY(release_id) REFERENCES releases(id)
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      release_id TEXT,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      details_json TEXT NOT NULL,
      verdict TEXT
    );

    CREATE TABLE IF NOT EXISTS skill_executions (
      id TEXT PRIMARY KEY,
      skill_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      release_id TEXT,
      triggered_by TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      status TEXT NOT NULL,
      inputs_json TEXT NOT NULL,
      outputs_json TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      error_message TEXT
    );
  `);
}

// Auto-initialize tables immediately
initDatabase();

// Releases Repository
export const ReleaseRepo = {
  getAll(): Release[] {
    const rows = db.prepare('SELECT * FROM releases ORDER BY updated_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      projectName: r.project_name,
      sourceBranch: r.source_branch,
      sourceEnvironment: r.source_environment,
      targetEnvironment: r.target_environment,
      status: r.status,
      planHash: r.plan_hash,
      version: r.version,
      components: JSON.parse(r.components_json),
      evidence: JSON.parse(r.evidence_json),
      riskScore: r.risk_score,
      riskLevel: r.risk_level,
      tags: JSON.parse(r.tags_json),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  getById(id: string): Release | null {
    const r = db.prepare('SELECT * FROM releases WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      projectName: r.project_name,
      sourceBranch: r.source_branch,
      sourceEnvironment: r.source_environment,
      targetEnvironment: r.target_environment,
      status: r.status,
      planHash: r.plan_hash,
      version: r.version,
      components: JSON.parse(r.components_json),
      evidence: JSON.parse(r.evidence_json),
      riskScore: r.risk_score,
      riskLevel: r.risk_level,
      tags: JSON.parse(r.tags_json),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  },

  save(release: Release): void {
    const existing = db.prepare('SELECT id FROM releases WHERE id = ?').get(release.id);
    if (existing) {
      db.prepare(`
        UPDATE releases SET
          title = ?,
          description = ?,
          project_name = ?,
          source_branch = ?,
          source_environment = ?,
          target_environment = ?,
          status = ?,
          plan_hash = ?,
          version = ?,
          components_json = ?,
          evidence_json = ?,
          risk_score = ?,
          risk_level = ?,
          tags_json = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        release.title,
        release.description,
        release.projectName,
        release.sourceBranch,
        release.sourceEnvironment,
        release.targetEnvironment,
        release.status,
        release.planHash,
        release.version,
        JSON.stringify(release.components),
        JSON.stringify(release.evidence),
        release.riskScore ?? null,
        release.riskLevel ?? null,
        JSON.stringify(release.tags),
        new Date().toISOString(),
        release.id
      );
    } else {
      db.prepare(`
        INSERT INTO releases (
          id, title, description, project_name, source_branch,
          source_environment, target_environment, status, plan_hash,
          version, components_json, evidence_json, risk_score,
          risk_level, tags_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        release.id,
        release.title,
        release.description,
        release.projectName,
        release.sourceBranch,
        release.sourceEnvironment,
        release.targetEnvironment,
        release.status,
        release.planHash,
        release.version,
        JSON.stringify(release.components),
        JSON.stringify(release.evidence),
        release.riskScore ?? null,
        release.riskLevel ?? null,
        JSON.stringify(release.tags),
        release.createdAt,
        release.updatedAt
      );
    }
  }
};

// Risk Assessments
export const RiskRepo = {
  getLatestByRelease(releaseId: string): RiskAssessment | null {
    const row = db.prepare('SELECT * FROM risk_assessments WHERE release_id = ? ORDER BY evaluated_at DESC LIMIT 1').get(releaseId) as any;
    if (!row) return null;
    return {
      id: row.id,
      releaseId: row.release_id,
      score: row.score,
      level: row.level,
      findings: JSON.parse(row.findings_json),
      explanation: row.explanation,
      evaluatedAt: row.evaluated_at
    };
  },

  save(assessment: RiskAssessment): void {
    db.prepare(`
      INSERT INTO risk_assessments (id, release_id, score, level, findings_json, explanation, evaluated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      assessment.id,
      assessment.releaseId,
      assessment.score,
      assessment.level,
      JSON.stringify(assessment.findings),
      assessment.explanation,
      assessment.evaluatedAt
    );
  }
};

// Policy Repo
export const DEFAULT_POLICIES: PolicyConfig = {
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

export const PolicyRepo = {
  getConfig(): PolicyConfig {
    const row = db.prepare('SELECT config_json FROM policies_config WHERE id = ?').get('global') as any;
    if (!row) return DEFAULT_POLICIES;
    return JSON.parse(row.config_json);
  },

  saveConfig(config: PolicyConfig): void {
    const existing = db.prepare('SELECT id FROM policies_config WHERE id = ?').get('global');
    if (existing) {
      db.prepare('UPDATE policies_config SET config_json = ?, updated_at = ? WHERE id = ?').run(
        JSON.stringify(config),
        new Date().toISOString(),
        'global'
      );
    } else {
      db.prepare('INSERT INTO policies_config (id, config_json, updated_at) VALUES (?, ?, ?)').run(
        'global',
        JSON.stringify(config),
        new Date().toISOString()
      );
    }
  },

  getLatestEvaluation(releaseId: string): PolicyEvaluation | null {
    const row = db.prepare('SELECT * FROM policy_evaluations WHERE release_id = ? ORDER BY evaluated_at DESC LIMIT 1').get(releaseId) as any;
    if (!row) return null;
    return {
      id: row.id,
      releaseId: row.release_id,
      overallVerdict: row.overall_verdict,
      isBlocked: Boolean(row.is_blocked),
      evaluations: JSON.parse(row.evaluations_json),
      evaluatedAt: row.evaluated_at
    };
  },

  saveEvaluation(evaluation: PolicyEvaluation): void {
    db.prepare(`
      INSERT INTO policy_evaluations (id, release_id, overall_verdict, is_blocked, evaluations_json, evaluated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      evaluation.id,
      evaluation.releaseId,
      evaluation.overallVerdict,
      evaluation.isBlocked ? 1 : 0,
      JSON.stringify(evaluation.evaluations),
      evaluation.evaluatedAt
    );
  }
};

// Approvals Repo
export const ApprovalRepo = {
  getByRelease(releaseId: string): Approval[] {
    const rows = db.prepare('SELECT * FROM approvals WHERE release_id = ? ORDER BY requested_at DESC').all(releaseId) as any[];
    return rows.map(r => ({
      id: r.id,
      releaseId: r.release_id,
      releasePlanHash: r.release_plan_hash,
      approverId: r.approver_id,
      approverName: r.approver_name,
      approverEmail: r.approver_email,
      approverRole: r.approver_role,
      status: r.status,
      requestedAt: r.requested_at,
      decisionAt: r.decision_at,
      expiresAt: r.expires_at,
      notes: r.notes
    }));
  },

  getAll(): Approval[] {
    const rows = db.prepare('SELECT * FROM approvals ORDER BY requested_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      releaseId: r.release_id,
      releasePlanHash: r.release_plan_hash,
      approverId: r.approver_id,
      approverName: r.approver_name,
      approverEmail: r.approver_email,
      approverRole: r.approver_role,
      status: r.status,
      requestedAt: r.requested_at,
      decisionAt: r.decision_at,
      expiresAt: r.expires_at,
      notes: r.notes
    }));
  },

  save(approval: Approval): void {
    const existing = db.prepare('SELECT id FROM approvals WHERE id = ?').get(approval.id);
    if (existing) {
      db.prepare(`
        UPDATE approvals SET
          status = ?,
          decision_at = ?,
          notes = ?
        WHERE id = ?
      `).run(approval.status, approval.decisionAt || null, approval.notes || null, approval.id);
    } else {
      db.prepare(`
        INSERT INTO approvals (
          id, release_id, release_plan_hash, approver_id, approver_name,
          approver_email, approver_role, status, requested_at, decision_at,
          expires_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        approval.id,
        approval.releaseId,
        approval.releasePlanHash,
        approval.approverId,
        approval.approverName,
        approval.approverEmail,
        approval.approverRole,
        approval.status,
        approval.requestedAt,
        approval.decisionAt || null,
        approval.expiresAt,
        approval.notes || null
      );
    }
  }
};

// Execution Records
export const ExecutionRepo = {
  getByRelease(releaseId: string): ExecutionRecord[] {
    const rows = db.prepare('SELECT * FROM execution_records WHERE release_id = ? ORDER BY started_at DESC').all(releaseId) as any[];
    return rows.map(r => ({
      id: r.id,
      releaseId: r.release_id,
      executedBy: r.executed_by,
      mode: r.mode,
      status: r.status,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      durationMs: r.duration_ms,
      adapterLogs: JSON.parse(r.adapter_logs_json),
      planHashVerified: Boolean(r.plan_hash_verified),
      errorMessage: r.error_message
    }));
  },

  getAll(): ExecutionRecord[] {
    const rows = db.prepare('SELECT * FROM execution_records ORDER BY started_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      releaseId: r.release_id,
      executedBy: r.executed_by,
      mode: r.mode,
      status: r.status,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      durationMs: r.duration_ms,
      adapterLogs: JSON.parse(r.adapter_logs_json),
      planHashVerified: Boolean(r.plan_hash_verified),
      errorMessage: r.error_message
    }));
  },

  save(rec: ExecutionRecord): void {
    db.prepare(`
      INSERT INTO execution_records (
        id, release_id, executed_by, mode, status, started_at, completed_at,
        duration_ms, adapter_logs_json, plan_hash_verified, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rec.id,
      rec.releaseId,
      rec.executedBy,
      rec.mode,
      rec.status,
      rec.startedAt,
      rec.completedAt,
      rec.durationMs,
      JSON.stringify(rec.adapterLogs),
      rec.planHashVerified ? 1 : 0,
      rec.errorMessage || null
    );
  }
};

// Incidents Repo
export const IncidentRepo = {
  getAll(): Incident[] {
    const rows = db.prepare('SELECT * FROM incidents ORDER BY occurred_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      releaseId: r.release_id,
      title: r.title,
      severity: r.severity,
      status: r.status,
      failedStage: r.failed_stage,
      occurredAt: r.occurred_at,
      errorMessage: r.error_message,
      probableCause: r.probable_cause,
      hypotheses: JSON.parse(r.hypotheses_json),
      confirmedEvidence: JSON.parse(r.confirmed_evidence_json),
      remediationSteps: JSON.parse(r.remediation_steps_json),
      postMortemReport: r.post_mortem_report
    }));
  },

  getById(id: string): Incident | null {
    const r = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      releaseId: r.release_id,
      title: r.title,
      severity: r.severity,
      status: r.status,
      failedStage: r.failed_stage,
      occurredAt: r.occurred_at,
      errorMessage: r.error_message,
      probableCause: r.probable_cause,
      hypotheses: JSON.parse(r.hypotheses_json),
      confirmedEvidence: JSON.parse(r.confirmed_evidence_json),
      remediationSteps: JSON.parse(r.remediation_steps_json),
      postMortemReport: r.post_mortem_report
    };
  },

  save(incident: Incident): void {
    const existing = db.prepare('SELECT id FROM incidents WHERE id = ?').get(incident.id);
    if (existing) {
      db.prepare(`
        UPDATE incidents SET
          status = ?,
          probable_cause = ?,
          hypotheses_json = ?,
          confirmed_evidence_json = ?,
          remediation_steps_json = ?,
          post_mortem_report = ?
        WHERE id = ?
      `).run(
        incident.status,
        incident.probableCause,
        JSON.stringify(incident.hypotheses),
        JSON.stringify(incident.confirmedEvidence),
        JSON.stringify(incident.remediationSteps),
        incident.postMortemReport || null,
        incident.id
      );
    } else {
      db.prepare(`
        INSERT INTO incidents (
          id, release_id, title, severity, status, failed_stage, occurred_at,
          error_message, probable_cause, hypotheses_json, confirmed_evidence_json,
          remediation_steps_json, post_mortem_report
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        incident.id,
        incident.releaseId,
        incident.title,
        incident.severity,
        incident.status,
        incident.failedStage,
        incident.occurredAt,
        incident.errorMessage,
        incident.probableCause,
        JSON.stringify(incident.hypotheses),
        JSON.stringify(incident.confirmedEvidence),
        JSON.stringify(incident.remediationSteps),
        incident.postMortemReport || null
      );
    }
  }
};

// Audit Events Repo
export const AuditRepo = {
  getAll(limit = 100): AuditEvent[] {
    const rows = db.prepare('SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT ?').all(limit) as any[];
    return rows.map(r => ({
      id: r.id,
      releaseId: r.release_id,
      action: r.action,
      actor: r.actor,
      actorType: r.actor_type,
      timestamp: r.timestamp,
      details: JSON.parse(r.details_json),
      verdict: r.verdict
    }));
  },

  record(event: Omit<AuditEvent, 'id'>): AuditEvent {
    const id = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullEvent: AuditEvent = { ...event, id };
    db.prepare(`
      INSERT INTO audit_events (id, release_id, action, actor, actor_type, timestamp, details_json, verdict)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fullEvent.id,
      fullEvent.releaseId || null,
      fullEvent.action,
      fullEvent.actor,
      fullEvent.actorType,
      fullEvent.timestamp,
      JSON.stringify(fullEvent.details),
      fullEvent.verdict || null
    );
    return fullEvent;
  }
};

// Skill Executions Repo
export const SkillExecutionRepo = {
  getAll(limit = 100): SkillExecution[] {
    const rows = db.prepare('SELECT * FROM skill_executions ORDER BY started_at DESC LIMIT ?').all(limit) as any[];
    return rows.map(r => ({
      id: r.id,
      skillId: r.skill_id,
      skillName: r.skill_name,
      releaseId: r.release_id,
      triggeredBy: r.triggered_by,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      status: r.status,
      inputs: JSON.parse(r.inputs_json),
      outputs: JSON.parse(r.outputs_json),
      durationMs: r.duration_ms,
      errorMessage: r.error_message
    }));
  },

  record(exec: SkillExecution): void {
    db.prepare(`
      INSERT INTO skill_executions (
        id, skill_id, skill_name, release_id, triggered_by, started_at,
        completed_at, status, inputs_json, outputs_json, duration_ms, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      exec.id,
      exec.skillId,
      exec.skillName,
      exec.releaseId || null,
      exec.triggeredBy,
      exec.startedAt,
      exec.completedAt,
      exec.status,
      JSON.stringify(exec.inputs),
      JSON.stringify(exec.outputs),
      exec.durationMs,
      exec.errorMessage || null
    );
  }
};
