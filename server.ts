import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  ReleaseRepo,
  RiskRepo,
  PolicyRepo,
  ApprovalRepo,
  ExecutionRepo,
  IncidentRepo,
  AuditRepo,
  SkillExecutionRepo
} from './packages/core/src/database/db.ts';
import { seedDatabase, calculatePlanHash } from './packages/core/src/database/seed.ts';
import { skillRegistry } from './packages/agent-skills/registry.ts';
import { agentSkillsOrchestrator } from './packages/agent-skills/orchestrator.ts';
import { agentiaAdapter } from './packages/core/src/adapters/agentia-adapter.ts';
import { aiAnalyst } from './packages/core/src/ai-analyst/index.ts';
import { evaluateReleaseRisk } from './packages/core/src/risk-engine/index.ts';
import { evaluateReleasePolicies } from './packages/core/src/policy-engine/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize database
seedDatabase();

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// System Diagnostics & Summary Stats
app.get('/api/stats', async (_req, res) => {
  try {
    const releases = ReleaseRepo.getAll();
    const total = releases.length;
    const safe = releases.filter(r => (r.riskScore ?? 0) <= 50 && r.status !== 'BLOCKED' && r.status !== 'FAILED').length;
    const blocked = releases.filter(r => r.status === 'BLOCKED').length;
    const critical = releases.filter(r => r.riskLevel === 'CRITICAL' || (r.riskScore ?? 0) >= 76).length;
    const pendingApprovals = ApprovalRepo.getAll().filter(a => a.status === 'PENDING').length;
    const skillHistory = SkillExecutionRepo.getAll(50);
    const recentAudits = AuditRepo.getAll(20);
    const agentiaStatus = await agentiaAdapter.getStatus();

    res.json({
      totalReleases: total,
      safeReleases: safe,
      blockedReleases: blocked,
      criticalRisks: critical,
      pendingApprovals,
      recentActivityCount: recentAudits.length,
      skillExecutionCount: skillHistory.length,
      agentiaStatus
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Releases Listing
app.get('/api/releases', (_req, res) => {
  try {
    const releases = ReleaseRepo.getAll();
    res.json(releases);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single Release Details
app.get('/api/releases/:id', (req, res) => {
  try {
    const release = ReleaseRepo.getById(req.params.id);
    if (!release) return res.status(404).json({ error: 'Release not found' });

    const risk = RiskRepo.getLatestByRelease(release.id);
    const policy = PolicyRepo.getLatestEvaluation(release.id);
    const approvals = ApprovalRepo.getByRelease(release.id);
    const executions = ExecutionRepo.getByRelease(release.id);

    res.json({
      release,
      latestRisk: risk,
      latestPolicy: policy,
      approvals,
      executions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Approvals Listing
app.get('/api/approvals', (_req, res) => {
  try {
    const approvals = ApprovalRepo.getAll();
    res.json(approvals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new Release
app.post('/api/releases', (req, res) => {
  try {
    const { id, title, description, projectName, sourceBranch, sourceEnvironment, targetEnvironment, version, components, tags } = req.body;
    if (!id || !title) return res.status(400).json({ error: 'Release id and title are required' });

    const newRelease = {
      id,
      title,
      description: description || '',
      projectName: projectName || 'Default Project',
      sourceBranch: sourceBranch || 'main',
      sourceEnvironment: sourceEnvironment || 'DEV',
      targetEnvironment: targetEnvironment || 'QA',
      status: 'DRAFT' as const,
      version: version || 'v1.0.0',
      planHash: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: tags || ['custom'],
      components: components || [],
      evidence: {
        tests: { hasRun: false, passed: false, totalTests: 0, failedTests: 0, codeCoveragePercent: 0 },
        dependencies: { unresolvedCount: 0, circularCount: 0, missingPackages: [], externalServicesVerified: true },
        security: { criticalVulnerabilities: 0, highVulnerabilities: 0, secretLeaksDetected: false, compliancePassed: true },
        environmentValidated: false,
        missingEvidenceFields: ['Unit test report']
      },
      riskScore: 40,
      riskLevel: 'MEDIUM' as const
    };

    newRelease.planHash = calculatePlanHash(newRelease);
    ReleaseRepo.save(newRelease);

    AuditRepo.record({
      releaseId: newRelease.id,
      action: 'RELEASE_CREATED',
      actor: 'User / Dashboard',
      actorType: 'HUMAN',
      timestamp: new Date().toISOString(),
      details: { title: newRelease.title, targetEnvironment: newRelease.targetEnvironment },
      verdict: 'SUCCESS'
    });

    res.status(201).json(newRelease);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Standout Scenario: Update evidence (e.g. user supplies missing tests & certifies staging)
app.post('/api/releases/:id/update-evidence', (req, res) => {
  try {
    const release = ReleaseRepo.getById(req.params.id);
    if (!release) return res.status(404).json({ error: 'Release not found' });

    const { tests, dependencies, security, environmentValidated, missingEvidenceFields, sourceEnvironment } = req.body;

    if (tests) release.evidence.tests = { ...release.evidence.tests, ...tests };
    if (dependencies) release.evidence.dependencies = { ...release.evidence.dependencies, ...dependencies };
    if (security) release.evidence.security = { ...release.evidence.security, ...security };
    if (typeof environmentValidated === 'boolean') release.evidence.environmentValidated = environmentValidated;
    if (Array.isArray(missingEvidenceFields)) release.evidence.missingEvidenceFields = missingEvidenceFields;
    if (sourceEnvironment) release.sourceEnvironment = sourceEnvironment;

    release.updatedAt = new Date().toISOString();
    release.planHash = calculatePlanHash(release);
    ReleaseRepo.save(release);

    AuditRepo.record({
      releaseId: release.id,
      action: 'RELEASE_EVIDENCE_UPDATED',
      actor: 'User / Engineer',
      actorType: 'HUMAN',
      timestamp: new Date().toISOString(),
      details: {
        testsPassed: release.evidence.tests.passed,
        coverage: release.evidence.tests.codeCoveragePercent,
        missingCount: release.evidence.missingEvidenceFields.length
      },
      verdict: 'SUCCESS'
    });

    res.json({ message: 'Release evidence updated successfully', release });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Inspect Release
app.post('/api/releases/:id/inspect', async (req, res) => {
  try {
    const result = await skillRegistry.executeSkill('release-inspection', {
      releaseId: req.params.id,
      deepScan: req.body.deepScan ?? true
    }, 'REST API');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Analyze Risk
app.post('/api/releases/:id/analyze-risk', async (req, res) => {
  try {
    const result = await skillRegistry.executeSkill('release-risk-analysis', {
      releaseId: req.params.id
    }, 'REST API');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Validate Policy
app.post('/api/releases/:id/validate-policy', async (req, res) => {
  try {
    const result = await skillRegistry.executeSkill('release-policy-validation', {
      releaseId: req.params.id,
      policyOverrides: req.body.policyOverrides
    }, 'REST API');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Release Remediation Plan
app.post('/api/releases/:id/remediate', async (req, res) => {
  try {
    const result = await skillRegistry.executeSkill('release-remediation', {
      releaseId: req.params.id
    }, 'REST API');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Autonomous Multi-Skill Pipeline (assess readiness end-to-end)
app.post('/api/releases/:id/workflow/run-all', async (req, res) => {
  try {
    const report = await agentSkillsOrchestrator.assessReleaseReadiness(req.params.id, 'Dashboard Autonomous Run');
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Request Human Approval
app.post('/api/releases/:id/request-approval', (req, res) => {
  try {
    const release = ReleaseRepo.getById(req.params.id);
    if (!release) return res.status(404).json({ error: 'Release not found' });

    const { approverName, approverEmail, approverRole, notes } = req.body;
    const approval = {
      id: `APP-${Date.now().toString(36)}`,
      releaseId: release.id,
      releasePlanHash: release.planHash,
      approverId: 'USR-PENDING',
      approverName: approverName || 'Designated Release Signer',
      approverEmail: approverEmail || 'signer@enterprise.internal',
      approverRole: approverRole || 'Release Manager',
      status: 'PENDING' as const,
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
      notes: notes || 'Pending sign-off review.'
    };

    ApprovalRepo.save(approval);
    release.status = 'AWAITING_APPROVAL';
    ReleaseRepo.save(release);

    AuditRepo.record({
      releaseId: release.id,
      action: 'APPROVAL_REQUESTED',
      actor: approverName || 'Release Manager',
      actorType: 'HUMAN',
      timestamp: new Date().toISOString(),
      details: { approvalId: approval.id, target: release.targetEnvironment },
      verdict: 'PENDING'
    });

    res.json(approval);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Grant / Reject Approval
app.post('/api/releases/:id/approve', (req, res) => {
  try {
    const release = ReleaseRepo.getById(req.params.id);
    if (!release) return res.status(404).json({ error: 'Release not found' });

    const { approverName, approverRole, decision, notes, approvalId } = req.body;
    const isApproved = decision !== 'REJECT';

    // Verify release plan hash hasn't drifted
    const currentHash = calculatePlanHash(release);
    if (release.planHash !== currentHash) {
      return res.status(400).json({
        error: 'Release plan has changed since creation. Hash mismatch! Recalculate plan before approving.'
      });
    }

    const app = {
      id: approvalId || `APP-${Date.now().toString(36)}`,
      releaseId: release.id,
      releasePlanHash: release.planHash,
      approverId: 'USR-AUTH',
      approverName: approverName || 'Sarah Connor',
      approverEmail: 'sarah.connor@enterprise.internal',
      approverRole: approverRole || 'VP of Engineering',
      status: isApproved ? ('APPROVED' as const) : ('REJECTED' as const),
      requestedAt: new Date().toISOString(),
      decisionAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
      notes: notes || (isApproved ? 'Approved for production cutover after risk verification.' : 'Rejected due to unresolved architectural concerns.')
    };

    ApprovalRepo.save(app);

    if (isApproved) {
      release.status = 'APPROVED';
    } else {
      release.status = 'BLOCKED';
    }
    ReleaseRepo.save(release);

    AuditRepo.record({
      releaseId: release.id,
      action: isApproved ? 'HUMAN_APPROVAL_GRANTED' : 'HUMAN_APPROVAL_REJECTED',
      actor: app.approverName,
      actorType: 'HUMAN',
      timestamp: new Date().toISOString(),
      details: { approvalId: app.id, planHash: release.planHash, role: app.approverRole },
      verdict: isApproved ? 'SUCCESS' : 'BLOCK'
    });

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Safe Execute Release
app.post('/api/releases/:id/execute', async (req, res) => {
  try {
    const { executedBy, humanConfirmed } = req.body;
    const result = await skillRegistry.executeSkill('safe-release-execution', {
      releaseId: req.params.id,
      executedBy: executedBy || 'Release Operations Team',
      humanConfirmed: Boolean(humanConfirmed)
    }, 'REST API');

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Skill Center APIs
app.get('/api/skills', (_req, res) => {
  try {
    const skills = skillRegistry.getAllSkills();
    res.json(skills.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      version: s.version,
      category: s.category,
      author: s.author,
      status: s.status,
      executionCount: s.executionCount,
      lastExecutedAt: s.lastExecutedAt,
      markdownDoc: s.markdownDoc
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/skills/:id/run', async (req, res) => {
  try {
    const result = await skillRegistry.executeSkill(req.params.id, req.body, 'Skill Center UI');
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/skills/history', (_req, res) => {
  try {
    const history = SkillExecutionRepo.getAll(100);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Policies Management
app.get('/api/policies', (_req, res) => {
  try {
    const config = PolicyRepo.getConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/policies', (req, res) => {
  try {
    const current = PolicyRepo.getConfig();
    const updated = { ...current, ...req.body };
    PolicyRepo.saveConfig(updated);

    AuditRepo.record({
      action: 'POLICY_CONFIGURATION_UPDATED',
      actor: 'Admin / Security Architect',
      actorType: 'HUMAN',
      timestamp: new Date().toISOString(),
      details: { changedKeys: Object.keys(req.body) },
      verdict: 'SUCCESS'
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Incidents
app.get('/api/incidents', (_req, res) => {
  try {
    const incidents = IncidentRepo.getAll();
    res.json(incidents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/incidents/:id/investigate', async (req, res) => {
  try {
    const result = await skillRegistry.executeSkill('incident-investigation', {
      incidentId: req.params.id
    }, 'Incident Center UI');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Audit Center
app.get('/api/audit', (_req, res) => {
  try {
    const audits = AuditRepo.getAll(200);
    res.json(audits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Agentia CLI Integration Status
app.get('/api/agentia/status', async (_req, res) => {
  try {
    const status = await agentiaAdapter.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Release Analyst
app.post('/api/ai/explain', async (req, res) => {
  try {
    const { type, releaseId, incidentId, userQuery } = req.body;
    const release = (releaseId ? ReleaseRepo.getById(releaseId) : undefined) || undefined;
    const riskAssessment = releaseId ? RiskRepo.getLatestByRelease(releaseId) ?? undefined : undefined;
    const policyEvaluation = releaseId ? PolicyRepo.getLatestEvaluation(releaseId) ?? undefined : undefined;
    const incident = incidentId ? (IncidentRepo.getById(incidentId) || undefined) : undefined;

    const result = await aiAnalyst.explain({
      type: type || 'RISK_SUMMARY',
      release,
      riskAssessment,
      policyEvaluation,
      incident,
      userQuery
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Demo Data Reset (Allows user to reset sandbox to fresh demo state anytime)
app.post('/api/system/reset-demo', (_req, res) => {
  try {
    seedDatabase(true);
    res.json({ message: 'Demo environment reset to initial state with 8 releases and Standout Scenario RLS-104.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// VITE DEV SERVER / STATIC ASSET MIDDLEWARE
// -------------------------------------------------------------
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const portNum = typeof PORT === 'string' ? parseInt(PORT, 10) : Number(PORT);
  app.listen(portNum, '0.0.0.0', () => {
    console.log(`[ReleaseSentry AI] Server running on http://0.0.0.0:${portNum}`);
  });
}

startServer();
