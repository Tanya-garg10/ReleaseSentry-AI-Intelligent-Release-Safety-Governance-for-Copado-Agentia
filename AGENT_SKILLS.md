# Agent Skills Architecture (`packages/agent-skills/`)

## Design Principles

In ReleaseSentry AI, Agent Skills are not passive markdown prompts. They are modular, discoverable, executable units of release intelligence that can be invoked individually or chained in automated pipelines.

---

## Detailed Skill Specifications

### 1. `release-inspection`
- **Location**: `packages/agent-skills/release-inspection/SKILL.md`
- **Input**: `{ releaseId: string, deepScan?: boolean }`
- **Output**: Component counts, destructive actions, attached test runs, code coverage, missing evidence checklist, and SHA-256 release plan hash.
- **Rules**: Missing data must never be fabricated; it must be marked `UNKNOWN`.

### 2. `release-risk-analysis`
- **Location**: `packages/agent-skills/release-risk-analysis/SKILL.md`
- **Input**: `{ releaseId: string, inspectionResult?: object }`
- **Output**: Deterministic score (0–100), Level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and traceable findings with mathematical contributions.
- **Rules**: Avoid double-counting; penalty points must be traceable to concrete metadata or missing evidence.

### 3. `release-policy-validation`
- **Location**: `packages/agent-skills/release-policy-validation/SKILL.md`
- **Input**: `{ releaseId: string, policyOverrides?: object }`
- **Output**: Overall verdict (`PASS`, `WARNING`, `BLOCK`), boolean `isBlocked`, and per-rule explanations.
- **Rules**: AI agents cannot bypass or override `BLOCK` verdicts.

### 4. `safe-release-execution`
- **Location**: `packages/agent-skills/safe-release-execution/SKILL.md`
- **Input**: `{ releaseId: string, executedBy: string, humanConfirmed: boolean }`
- **Output**: Execution record with SHA-256 plan hash check, adapter logs, duration, and status.
- **Rules**: Pre-flight gates re-evaluate risk and policies in real time; plan changes invalidate previous approvals.

### 5. `incident-investigation`
- **Location**: `packages/agent-skills/incident-investigation/SKILL.md`
- **Input**: `{ incidentId?: string, releaseId?: string }`
- **Output**: Post-mortem report, failed stage, probable causes, segregated confirmed evidence vs hypotheses, and remediation steps.

### 6. `release-remediation`
- **Location**: `packages/agent-skills/release-remediation/SKILL.md`
- **Input**: `{ releaseId: string }`
- **Output**: Prioritized engineering action plan with automated CLI commands and re-inspection triggers.

---

## Skill Orchestration Flow

```typescript
import { agentSkillsOrchestrator } from './packages/agent-skills/orchestrator.ts';

// Autonomous multi-skill readiness assessment
const report = await agentSkillsOrchestrator.assessReleaseReadiness('RLS-104');

console.log(report.overallStatus); // 'BLOCKED'
console.log(report.inspection);    // 5 components, missing evidence
console.log(report.risk);          // 100/100 CRITICAL
console.log(report.policy);        // BLOCK: missing tests, missing approval
console.log(report.remediation);   // 5 prioritized fixes
```
