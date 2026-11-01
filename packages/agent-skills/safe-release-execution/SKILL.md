---
name: "safe-release-execution"
description: "Safely execute approved releases with mandatory revalidation gates, hash verification, and audit recording."
version: "1.2.0"
category: "execution"
author: "ReleaseSentry Agent Skills"
---

# Safe Release Execution Skill

## Purpose
Governs and executes the final release operation. Even after prior approvals, safe execution performs atomic pre-flight checks, verifies release plan integrity, and routes commands through authorized Copado Agentia adapters.

## Mandatory Execution Sequence
1. **Load Release**: Retrieve complete release record and component specification.
2. **Verify Release Plan Hash**: Compute current SHA-256 plan hash and verify it matches the approved plan hash. Any drift invalidates the approval!
3. **Check Approval Identity & Status**: Confirm human approver identity, designated authorization tier, and valid status.
4. **Check Approval Expiry**: Reject if current UTC timestamp exceeds `expiresAt`.
5. **Recalculate Risk**: Re-run the risk engine on real-time evidence. If risk degraded to CRITICAL, halt immediately.
6. **Revalidate Mandatory Policies**: Confirm all blocking rules still evaluate to `PASS`.
7. **Display Execution Summary**: Present target environment, component counts, adapter mode (DEMO vs LIVE), and execution actor.
8. **Require Human Confirmation**: Verify human-in-the-loop confirmation where required by policy.
9. **Execute Operation**: Execute only the approved release operation via the Copado Agentia adapter.
10. **Record Audit & Execution History**: Store full logs, duration, status, and immutable audit event.

## Invariant Protections
- **No Self-Approval**: AI agents are strictly prohibited from approving their own production releases.
- **No Stale Execution**: Any modification to the release components or plan automatically revokes existing approvals.
- **Fail-Safe**: Adapter errors trigger immediate rollback states and audit alerts.
