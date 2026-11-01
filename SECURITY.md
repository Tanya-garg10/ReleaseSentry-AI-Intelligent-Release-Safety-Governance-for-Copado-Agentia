# Security & Governance Architecture

## Governance Invariants

1. **AI Agents Cannot Self-Approve**: Autonomous skills and agents cannot grant production approvals. Production promotion requires an authenticated human actor.
2. **Plan Integrity Protection**: Every release is locked with an SHA-256 hash. If components are edited after an approval is granted, that approval is revoked immediately.
3. **Deterministic Policy-as-Code**: Gate decisions (`PASS`, `WARNING`, `BLOCK`) are computed deterministically. AI explanations are advisory only.
4. **Credential Redaction**: The Copado Agentia adapter scrubs sensitive tokens, bearer headers, and secrets before logging or storage.
5. **No Shell String Concatenation**: Subprocess execution strictly uses typed argument arrays via `child_process.spawn`.
6. **Immutable Audit Ledger**: All governance decisions, risk calculations, policy blocks, approvals, and adapter outputs are recorded in the SQLite audit ledger.
