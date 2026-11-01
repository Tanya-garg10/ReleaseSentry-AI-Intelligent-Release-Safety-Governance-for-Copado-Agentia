#!/usr/bin/env node
import { ReleaseRepo, RiskRepo, PolicyRepo, ApprovalRepo, ExecutionRepo, IncidentRepo, AuditRepo, SkillExecutionRepo } from '../core/src/database/db.ts';
import { seedDatabase, calculatePlanHash } from '../core/src/database/seed.ts';
import { skillRegistry } from '../agent-skills/registry.ts';
import { agentSkillsOrchestrator } from '../agent-skills/orchestrator.ts';
import { agentiaAdapter } from '../core/src/adapters/agentia-adapter.ts';

// Ensure DB is initialized and seeded
seedDatabase();

const args = process.argv.slice(2);
const isJson = args.includes('--json') || args.includes('-j');

function output(data: any, text: string) {
  if (isJson) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(text);
  }
}

function showHelp() {
  console.log(`
ReleaseSentry AI - Headless Release Governance CLI
Tagline: Inspect. Analyze. Govern. Release with Confidence.

Usage: releasesentry <command> [subcommand] [arguments] [options]

Commands:
  init                             Initialize local database and load seed policies
  doctor                           Check Agentia adapter, database, and system health
  skills list                      List all registered Agent Skills and statuses
  skills run <skill-id> <rel-id>   Execute a specific Agent Skill against a release
  inspect <release-id>             Run release inspection skill
  risk analyze <release-id>        Run release risk engine and calculate score
  policy check <release-id>        Validate release against governance policies
  release plan <release-id>        Generate or inspect cryptographic release plan
  release status <release-id>      Show comprehensive lifecycle and gate status
  release approve <release-id>     Record authorized human approval for release
  release execute <release-id>     Safely execute approved release via adapter
  incident analyze <incident-id>   Run root-cause analysis on an incident
  report export [--format json]    Export full release governance audit report

Options:
  --json, -j                       Output response in formatted JSON
  --help, -h                       Show command usage and help
`);
}

async function runCli() {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const cmd = args[0];
  const sub = args[1];

  try {
    switch (cmd) {
      case 'init': {
        seedDatabase();
        output({ status: 'ok', message: 'ReleaseSentry AI initialized successfully.' }, '✓ ReleaseSentry AI database and policy store initialized successfully.');
        break;
      }

      case 'doctor': {
        const agentia = await agentiaAdapter.getStatus();
        const skills = skillRegistry.getAllSkills();
        const releaseCount = ReleaseRepo.getAll().length;
        const res = {
          agentiaCli: agentia,
          database: { connected: true, releasesCount: releaseCount },
          agentSkills: { discovered: skills.length, active: skills.filter(s => s.status === 'ACTIVE').length },
          timestamp: new Date().toISOString()
        };
        const text = `
ReleaseSentry AI Diagnostics & Health Check:
--------------------------------------------
[Database]       SQLite Persistent Store connected (${releaseCount} releases)
[Agent Skills]   ${skills.length} skills discovered and registered
[Copado Agentia] Mode: ${agentia.mode} (${agentia.notice})
                 CLI Version: ${agentia.version}
                 Active Org:  ${agentia.activeOrg}
Status: System healthy and ready for headless release governance.
`;
        output(res, text);
        break;
      }

      case 'skills': {
        if (sub === 'list') {
          const skills = skillRegistry.getAllSkills();
          const data = skills.map(s => ({
            id: s.id,
            name: s.name,
            version: s.version,
            category: s.category,
            executionCount: s.executionCount,
            lastExecutedAt: s.lastExecutedAt || 'never'
          }));
          const text = skills.map(s => `• [${s.id}] ${s.name} (v${s.version}) - ${s.description}\n  Executions: ${s.executionCount} | Last Run: ${s.lastExecutedAt || 'never'}`).join('\n\n');
          output(data, text);
        } else if (sub === 'run') {
          const skillId = args[2];
          const releaseId = args[3] || 'RLS-104';
          if (!skillId) {
            console.error('Error: Missing skill-id. Example: releasesentry skills run release-inspection RLS-104');
            process.exit(1);
          }
          const res = await skillRegistry.executeSkill(skillId, { releaseId }, 'CLI');
          output(res, `✓ Skill [${skillId}] executed successfully in ${res.durationMs}ms:\n${JSON.stringify(res.output, null, 2)}`);
        } else {
          showHelp();
        }
        break;
      }

      case 'inspect': {
        const releaseId = sub || 'RLS-104';
        const res = await skillRegistry.executeSkill('release-inspection', { releaseId, deepScan: true }, 'CLI');
        output(res.output, `
Inspection Results for ${releaseId}:
-----------------------------------
Target Org:       ${res.output.targetEnvironment} (Source: ${res.output.sourceEnvironment})
Components:       ${res.output.componentSummary.total} total (${res.output.componentSummary.destructive} destructive)
Test Run Found:   ${res.output.evidence.testsFound ? 'YES' : 'NO (MISSING)'}
Missing Evidence: ${res.output.missingEvidenceFields.join(', ') || 'None'}
Warnings:         ${res.output.warnings.join('; ') || 'None'}
Plan Hash:        ${res.output.planHash}
`);
        break;
      }

      case 'risk': {
        const releaseId = (sub === 'analyze' ? args[2] : sub) || 'RLS-104';
        const res = await skillRegistry.executeSkill('release-risk-analysis', { releaseId }, 'CLI');
        output(res.output, `
Release Risk Assessment for ${releaseId}:
----------------------------------------
Score: ${res.output.score}/100 (${res.output.level} Risk)
Summary: ${res.output.summary}

Findings (${res.output.findings.length}):
${res.output.findings.map((f: any, i: number) => `  ${i + 1}. [${f.severity}] ${f.title} (Contribution: +${f.riskContribution})
     Evidence: ${f.evidence}
     Remedy:   ${f.recommendedRemediation}`).join('\n\n')}
`);
        break;
      }

      case 'policy': {
        const releaseId = (sub === 'check' ? args[2] : sub) || 'RLS-104';
        const res = await skillRegistry.executeSkill('release-policy-validation', { releaseId }, 'CLI');
        output(res.output, `
Policy Gate Evaluation for ${releaseId}:
---------------------------------------
Overall Verdict: ${res.output.overallVerdict} (Blocked: ${res.output.isBlocked ? 'YES' : 'NO'})

Rule Breakdown:
${res.output.evaluations.map((e: any) => `  [${e.verdict}] ${e.ruleName}: ${e.reason}`).join('\n')}
`);
        break;
      }

      case 'release': {
        const action = sub;
        const releaseId = args[2] || 'RLS-104';
        const release = ReleaseRepo.getById(releaseId);
        if (!release) {
          console.error(`Error: Release ${releaseId} not found.`);
          process.exit(1);
        }

        if (action === 'status') {
          const report = await agentSkillsOrchestrator.assessReleaseReadiness(releaseId, 'CLI');
          output(report, `
Release Status: ${release.id} - ${release.title}
Status:         ${release.status}
Target Env:     ${release.targetEnvironment}
Plan Hash:      ${release.planHash}
Overall Gate:   ${report.overallStatus}
Can Execute:    ${report.canExecute ? 'YES' : 'NO'}
Summary:        ${report.summary}
`);
        } else if (action === 'plan') {
          const hash = calculatePlanHash(release);
          output({ releaseId: release.id, planHash: hash, components: release.components }, `
Release Plan: ${release.id} (Version: ${release.version})
Target:       ${release.targetEnvironment}
Plan Hash:    ${hash}
Components (${release.components.length}):
${release.components.map(c => `  - [${c.action}] ${c.type}: ${c.name} (${c.linesChanged} lines changed)`).join('\n')}
`);
        } else if (action === 'approve') {
          const approver = args.find(a => a.startsWith('--approver='))?.split('=')[1] || 'Sarah Connor (VP Eng)';
          const hash = calculatePlanHash(release);
          const app = {
            id: `APP-CLI-${Date.now().toString(36)}`,
            releaseId: release.id,
            releasePlanHash: hash,
            approverId: 'USR-CLI',
            approverName: approver,
            approverEmail: 'approver@enterprise.internal',
            approverRole: 'Authorized Release Executive',
            status: 'APPROVED' as const,
            requestedAt: new Date().toISOString(),
            decisionAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
            notes: 'Approved via ReleaseSentry CLI'
          };
          ApprovalRepo.save(app);
          release.status = 'APPROVED';
          ReleaseRepo.save(release);
          output(app, `✓ Release ${releaseId} approved successfully by ${approver}. Active for 24 hours.`);
        } else if (action === 'execute') {
          const res = await skillRegistry.executeSkill('safe-release-execution', {
            releaseId,
            executedBy: 'ReleaseSentry CLI Operator',
            humanConfirmed: true
          }, 'CLI');
          output(res.output, `
✓ Release Execution Completed:
------------------------------
Release ID:   ${res.output.releaseId}
Execution ID: ${res.output.executionId}
Status:       ${res.output.status}
Mode:         ${res.output.mode}
Duration:     ${res.output.durationMs}ms
Logs:
${res.output.adapterLogs.map((l: string) => `  ${l}`).join('\n')}
`);
        } else {
          showHelp();
        }
        break;
      }

      case 'incident': {
        const incId = (sub === 'analyze' ? args[2] : sub) || 'INC-901';
        const res = await skillRegistry.executeSkill('incident-investigation', { incidentId: incId }, 'CLI');
        output(res.output, `
Incident Investigation: ${res.output.incidentId} (${res.output.title})
-----------------------------------------------------------------
Severity:       ${res.output.severity}
Failed Stage:   ${res.output.failedStage}
Probable Cause: ${res.output.probableCause}

Confirmed Evidence:
${res.output.confirmedEvidence.map((e: string) => `  • ${e}`).join('\n')}

Hypotheses:
${res.output.hypotheses.map((h: string) => `  ? ${h}`).join('\n')}

Recommended Remediation:
${res.output.remediationSteps.map((s: string, i: number) => `  ${i + 1}. ${s}`).join('\n')}
`);
        break;
      }

      case 'report': {
        const report = {
          generatedAt: new Date().toISOString(),
          releases: ReleaseRepo.getAll(),
          approvals: ApprovalRepo.getAll(),
          executions: ExecutionRepo.getAll(),
          incidents: IncidentRepo.getAll(),
          audits: AuditRepo.getAll(50)
        };
        output(report, `✓ Generated complete release governance audit report with ${report.releases.length} releases and ${report.audits.length} audit records.`);
        break;
      }

      default:
        console.error(`Unknown command: ${cmd}`);
        showHelp();
        process.exit(1);
    }
  } catch (err: any) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

runCli();
