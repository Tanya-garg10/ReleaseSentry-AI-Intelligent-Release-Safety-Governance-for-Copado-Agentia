# Copado Agentia Integration Guide

## Overview

The `AgentiaAdapter` (`packages/core/src/adapters/agentia-adapter.ts`) provides a robust bridge between ReleaseSentry AI's governance rules and the Copado Agentia CLI.

---

## Dual Mode Operation

### 1. LIVE MODE
When `agentia` CLI is installed and authenticated in the host environment:
- Probes CLI version via `spawn('agentia', ['--version'])` without shell concatenation.
- Validates active Salesforce org credentials.
- Dispatches supported, verified commands:
  - `inspect_metadata`
  - `run_apex_tests`
  - `validate_package`
  - `deploy_metadata`
  - `rollback_deployment`

### 2. DEMO MODE
When running in testing or sandbox environments without live Salesforce/Copado credentials:
- Automatically activates high-fidelity simulated execution.
- Emits transparent notices: *"DEMO MODE ACTIVE: Operating in high-fidelity simulated release sandbox for hackathon evaluation. Real enterprise mutations are disabled."*
- Simulates multi-stage metadata deployment logs, test verification times, and failure injections.
- Never falsely claims demo mutations are live Salesforce deployments.

---

## Security Safeguards

- **No Shell Concatenation**: Commands are passed strictly as string arrays to `child_process.spawn`.
- **Credential Redaction**: All tokens, passwords, and authorization headers are scrubbed using regex patterns before persisting to logs or audit stores.
- **Process Timeouts**: Every CLI subprocess has a hard 15-second timeout with `SIGKILL` termination to prevent hung deployments.
- **Read-Only vs Mutating Separation**: Non-destructive operations (inspect, check status) can be triggered autonomously; mutating deployments require human-in-the-loop confirmation.
