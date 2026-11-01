---
name: "incident-investigation"
description: "Analyze failed release events, parse execution logs, correlate errors with changes, and identify root causes."
version: "1.2.0"
category: "incident"
author: "ReleaseSentry Agent Skills"
---

# Incident Investigation Skill

## Purpose
Systematically investigate failed deployment operations and post-release incidents. Parses adapter execution logs, correlates failures with specific component changes or environmental mismatches, isolates confirmed facts from hypotheses, and recommends immediate mitigations.

## Responsibilities
1. **Log Analysis**: Ingest and parse deployment logs from the execution record.
2. **Failure Point Identification**: Isolate the exact failing step (e.g. Apex test failure, missing dependent object, deployment timeout, permission error).
3. **Change Correlation**: Correlate failure symptoms with modified components (e.g., deleted field `Invoice_Status__c` referenced by Flow `Billing_Auto_Close`).
4. **Evidence Segregation**: Strictly distinguish:
   - **Confirmed Evidence**: Concrete log lines, missing schemas, explicit error codes.
   - **Hypotheses**: Plausible explanations requiring further verification.
5. **Actionable Remediation**: Provide step-by-step hotfix, rollback, or configuration remediation steps.

## Input Schema
```json
{
  "incidentId": "string (optional)",
  "releaseId": "string (optional)"
}
```

## Output Schema
```json
{
  "incidentId": "string",
  "releaseId": "string",
  "title": "string",
  "severity": "CRITICAL | HIGH | MEDIUM",
  "failedStage": "string",
  "probableCause": "string",
  "confirmedEvidence": ["string"],
  "hypotheses": ["string"],
  "remediationSteps": ["string"],
  "postMortemReport": "string",
  "analyzedAt": "string"
}
```
