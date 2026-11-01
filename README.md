# ReleaseSentry AI
> **Inspect. Analyze. Govern. Release with Confidence.**  
> An Agent-Skills-Powered Release Safety and Governance Platform for Copado Agentia.

Developed for the **Copado Agentia Headless Virtual Hackathon**.

---

## 🌟 Executive Summary

AI agents should not simply execute release actions blindly. In enterprise Salesforce and multi-cloud environments, automated deployments carry enormous operational, compliance, and financial risks. 

**ReleaseSentry AI** introduces an extensible, agent-skills-driven release governance layer that operates alongside Copado Agentia. Before any mutation occurs, ReleaseSentry AI:
1. **Inspects** the release bundle, changed components, and test evidence.
2. **Detects** missing release evidence or unverified dependencies.
3. **Calculates** an explainable, deterministic risk score from 0–100.
4. **Validates** configurable Policy-as-Code gates (PASS, WARNING, BLOCK).
5. **Recommends** prioritized remediation when releases are blocked.
6. **Enforces** human-in-the-loop authorization for production cutovers.
7. **Safely Executes** approved plans with cryptographic hash integrity.
8. **Maintains** an immutable audit trail with native Headless CLI and MCP server tools.

---

## 🏗️ Architecture Overview

```
                          ┌─────────────────────────────┐
                          │    External AI Agents /     │
                          │   Claude / CI/CD Workers    │
                          └──────────────┬──────────────┘
                                         │ (MCP / CLI)
                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           RELEASESENTRY AI                               │
│                                                                          │
│  ┌─────────────────────────┐          ┌───────────────────────────────┐  │
│  │    Headless CLI         │          │       Model Context Protocol  │  │
│  │   (releasesentry)       │          │       (MCP Server: 11 Tools)  │  │
│  └────────────┬────────────┘          └───────────────┬───────────────┘  │
│               │                                       │                  │
│               └───────────────────┬───────────────────┘                  │
│                                   ▼                                      │
│               ┌───────────────────────────────────────┐                  │
│               │   Agent Skills Execution Engine       │                  │
│               │    (Loader, Registry, Orchestrator)   │                  │
│               └───────────────────┬───────────────────┘                  │
│                                   │                                      │
│         ┌─────────────────────────┼─────────────────────────┐            │
│         ▼                         ▼                         ▼            │
│  [release-inspection]    [release-risk-analysis]  [release-policy-val]   │
│         │                         │                         │            │
│         ▼                         ▼                         ▼            │
│  [release-remediation]   [safe-release-execution] [incident-investigate] │
│                                   │                                      │
│               ┌───────────────────┴───────────────────┐                  │
│               │     Deterministic Policy-as-Code      │                  │
│               │     & SHA-256 Plan Hash Invariant     │                  │
│               └───────────────────┬───────────────────┘                  │
│                                   │                                      │
│               ┌───────────────────┴───────────────────┐                  │
│               │       Copado Agentia Adapter          │                  │
│               │   (LIVE CLI Mode / DEMO Sandbox Mode) │                  │
│               └───────────────────┬───────────────────┘                  │
│                                   │                                      │
│  ┌────────────────────────┐       │       ┌───────────────────────────┐  │
│  │  SQLite DB Persistence │◄──────┴──────►│ React + Vite SaaS Console │  │
│  │  (Node 22 DatabaseSync)│               │ (Tailwind + Recharts)     │  │
│  └────────────────────────┘               └───────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ The 6 Executable Agent Skills

Located in `packages/agent-skills/`, each skill is defined by an authoritative `SKILL.md` instruction specification and backed by executable TypeScript logic validated with Zod:

| Skill | Category | Purpose | Input / Output |
|---|---|---|---|
| **`release-inspection`** | Governance | Reads metadata, identifies promotional tiers, classifies destructive schema drops, scans test and security evidence. | Release ID → ReleaseInspection JSON |
| **`release-risk-analysis`** | Risk Engine | Calculates deterministic 0–100 score, classifies into LOW/MED/HIGH/CRITICAL, generates traceable findings. | Inspection Result → RiskAssessment JSON |
| **`release-policy-validation`**| Policy | Enforces organizational guardrails (Zero test failures, Production approval, Coverage gates). | Release ID → PASS / WARNING / BLOCK |
| **`release-remediation`** | Remediation| Converts release blockers into prioritized developer workflows and automated commands. | Release ID → RemediationPlan JSON |
| **`safe-release-execution`** | Execution | Performs pre-flight checks, verifies SHA-256 hash, checks human approval validity, dispatches via adapter. | Release ID → ExecutionRecord JSON |
| **`incident-investigation`** | Incidents | Ingests execution logs, correlates failures with schema changes, isolates evidence from hypotheses. | Incident ID → PostMortem JSON |

---

## 🎯 Standout Hackathon Scenario: RLS-104

Test the end-to-end multi-skill autonomous governance loop:
1. **Initial Condition**: Release `RLS-104` targets `PROD`. It has missing test evidence, unverified package dependency, and attempts direct promotion from `DEV` to `PROD`.
2. **Inspection & Risk Analysis**: Skills calculate a **100/100 CRITICAL risk score**.
3. **Policy Gate**: The policy engine issues an immediate **BLOCK**.
4. **Remediation**: The remediation skill outputs concrete commands to run automated tests and certify staging.
5. **Evidence Supply**: User stages remediated test evidence (52 tests passed, 94% coverage) and staging promotion.
6. **Re-Verification**: Skills chain re-evaluates. Risk plummets to **LOW (14/100)**.
7. **Human Approval**: Sarah Connor (VP Engineering) grants signoff cryptographically bound to the current release plan hash.
8. **Safe Execution**: Adapter pre-flight passes, execution succeeds, and audit event is recorded.

---

## 💻 Headless CLI (`releasesentry`)

The project includes a CLI that shares the same database and core engine:

```bash
# Diagnostics & Copado Agentia CLI health
npm run releasesentry -- doctor

# List discovered Agent Skills
npm run releasesentry -- skills list

# Inspect release
npm run releasesentry -- inspect RLS-104

# Run explainable risk analysis
npm run releasesentry -- risk analyze RLS-104

# Check governance policies
npm run releasesentry -- policy check RLS-104

# Generate release plan & SHA-256 hash
npm run releasesentry -- release plan RLS-104

# Check overall readiness status
npm run releasesentry -- release status RLS-104

# Record human approval
npm run releasesentry -- release approve RLS-104 --approver="Sarah Connor"

# Safely execute approved release
npm run releasesentry -- release execute RLS-104

# Export audit trail as JSON
npm run releasesentry -- report export --json
```

---

## 🤖 Model Context Protocol (MCP) Server

ReleaseSentry AI exposes 11 native MCP tools:
- `inspect_release`
- `analyze_release_risk`
- `validate_release_policy`
- `generate_release_plan`
- `get_release_status`
- `request_release_approval`
- `execute_approved_release`
- `analyze_incident`
- `export_audit_report`
- `list_agent_skills`
- `run_agent_skill`

Run the MCP server over stdio:
```bash
npm run mcp
```

---

## 🧪 Automated Test Suite (Vitest)

All 14 automated tests run hermetically:
```bash
npm test
```
Verifies:
- Risk calculation & classifications (0–100)
- Policy enforcement (PASS, WARNING, BLOCK)
- Agent skills discovery and execution
- Plan hash recalculation upon component drift
- Automatic approval expiration upon plan changes
- Pre-flight execution gate blocks
- Copado Agentia adapter redactions

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run full-stack dev server (Express + Vite on Port 3000)
npm run dev

# Run CLI health check
npm run releasesentry -- doctor
```
Open [http://localhost:3000](http://localhost:3000) to view the SaaS dashboard.
