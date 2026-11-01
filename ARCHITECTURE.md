# ReleaseSentry AI — Architecture & Design Specification

## System Invariants

1. **No Agent Self-Approval**: Autonomous agents can inspect, test, stage, and analyze, but they can never approve their own production releases. Production approval requires authenticated human executive sign-off.
2. **Plan Hash Cryptographic Invariant**: Every release plan has an SHA-256 hash derived from its ID, target environment, version, and component manifest. Changing any component automatically revokes and expires all existing approvals.
3. **Deterministic Policy Priority**: Policy gates are deterministic code, never LLM hallucinations. AI Analyst explanations are strictly advisory and cannot override a `BLOCK` verdict.
4. **No Silent Mutations**: Re-running inspection and remediation does not mutate external systems without auditable records.
5. **Separation of Evidence and Hypotheses**: Incident analysis strictly segregates verified log facts from plausible root-cause hypotheses.

---

## Directory Structure

```
├── packages/
│   ├── agent-skills/                    # Reusable Agent Skills Architecture
│   │   ├── release-inspection/SKILL.md
│   │   ├── release-risk-analysis/SKILL.md
│   │   ├── release-policy-validation/SKILL.md
│   │   ├── safe-release-execution/SKILL.md
│   │   ├── incident-investigation/SKILL.md
│   │   ├── release-remediation/SKILL.md
│   │   ├── skill-types.ts               # Zod validation schemas
│   │   ├── skill-loader.ts              # Automatic discovery & markdown parser
│   │   ├── skill-executor.ts            # Service connector
│   │   ├── registry.ts                  # In-memory & SQLite registry
│   │   └── orchestrator.ts              # Multi-skill chaining engine
│   ├── core/                            # Core Governance Platform Engine
│   │   └── src/
│   │       ├── types/                   # Unified domain models
│   │       ├── database/                # SQLite repositories & seed fixtures
│   │       ├── risk-engine/             # Explainable scoring engine (0-100)
│   │       ├── policy-engine/           # Configurable Policy-as-Code
│   │       ├── lifecycle/               # State machine & approval invariants
│   │       ├── adapters/                # Copado Agentia CLI adapter (DEMO/LIVE)
│   │       ├── ai-analyst/              # Gemini / deterministic explanation
│   │       └── __tests__/               # Vitest automated test suite
│   ├── cli/                             # Headless CLI
│   │   └── releasesentry.ts
│   └── mcp-server/                      # Official Model Context Protocol Server
│       └── index.ts
├── src/                                 # Enterprise React + Tailwind SPA
│   ├── components/
│   │   ├── Header.tsx                   # Top Bar Contract implementation
│   │   ├── StandoutWalkthroughModal.tsx # RLS-104 live demonstration
│   │   ├── AIAnalystDrawer.tsx          # Evidence-grounded explanation panel
│   │   └── views/                       # 10 dedicated view consoles
│   ├── api.ts                           # REST client
│   ├── App.tsx                          # Root coordinator
│   └── main.tsx
└── server.ts                            # Full-stack Node.js + Express + Vite dev server
```

---

## Data Flow: Chained Agent Skills Pipeline

When a user requests: *"Check whether Release RLS-104 is safe for production."*

```
1. Client / CLI / MCP triggers orchestrator.assessReleaseReadiness(RLS-104)
2. Orchestrator invokes release-inspection
   ├── Parses components (Apex, Flows, Custom Objects)
   ├── Evaluates test coverage & dependency reports
   └── Identifies missing records (Automated unit tests)
3. Orchestrator passes inspection output to release-risk-analysis
   ├── Computes risk penalties (+35 missing tests, +25 env mismatch, +15 destructive)
   └── Assigns 100/100 CRITICAL risk score
4. Orchestrator passes risk assessment to release-policy-validation
   ├── Evaluates 6 active governance policies
   └── Returns BLOCK on zero test failures & missing approval
5. Orchestrator invokes release-remediation
   └── Outputs prioritized developer fixes and automated CLI commands
6. Report compiled and displayed in UI / returned to CLI / returned to MCP
```
