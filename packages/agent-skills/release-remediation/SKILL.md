---
name: "release-remediation"
description: "Recommend safe, prioritized, actionable steps to resolve release blockers and re-enter validation."
version: "1.2.0"
category: "remediation"
author: "ReleaseSentry Agent Skills"
---

# Release Remediation Skill

## Purpose
Formulate concrete, actionable remediation plans when a release is in `BLOCKED` or high-risk status. Maps policy failures and critical risk findings to tangible engineering tasks, prioritizing blockers to restore release readiness.

## Responsibilities
1. **Blocker Mapping**: Translate each policy block (e.g. missing test evidence, unapproved plan, environment mismatch) into concrete developer workflows.
2. **Prioritization**: Order fixes by urgency:
   - Priority 1: Mandatory test & evidence failures
   - Priority 2: Security & dependency gaps
   - Priority 3: Governance & approval collection
3. **Rescan Requirements**: Explicitly list which evidence collections or inspections must be re-run after applying remediation.
4. **Automated Fix Suggestions**: Provide concrete CLI commands, test runner commands, or Copado Agentia parameters.
5. **Re-Validation Trigger**: Facilitate re-running `release-inspection`, `release-risk-analysis`, and `release-policy-validation` once fixes are staged.

## Input Schema
```json
{
  "releaseId": "string"
}
```

## Output Schema
```json
{
  "releaseId": "string",
  "blockerCount": "number",
  "remediationPlan": [
    {
      "priority": "number",
      "targetIssue": "string",
      "category": "string",
      "actionRequired": "string",
      "verificationMethod": "string",
      "automatedCommand": "string (optional)"
    }
  ],
  "requiredReinspections": ["string"],
  "estimatedRiskReduction": "number",
  "generatedAt": "string"
}
```
