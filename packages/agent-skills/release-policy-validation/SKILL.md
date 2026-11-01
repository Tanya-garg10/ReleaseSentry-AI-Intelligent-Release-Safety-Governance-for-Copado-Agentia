---
name: "release-policy-validation"
description: "Validate release readiness against configurable organizational governance policies."
version: "1.2.0"
category: "governance"
author: "ReleaseSentry Agent Skills"
---

# Release Policy Validation Skill

## Purpose
Enforce organizational release gates and regulatory guardrails against a release prior to execution. Evaluates the release against active policy rules and outputs unambiguous verdicts: `PASS`, `WARNING`, or `BLOCK`.

## Standard Mandatory Policies
1. **Production Requires Approval**: Any release destined for `PROD` must have an authorized, non-expired human approval.
2. **Failed Mandatory Tests Block Release**: Any unit or integration test failures unconditionally block deployment.
3. **Missing Mandatory Evidence Blocks Release**: Deployments cannot proceed when critical test or verification records are missing.
4. **Critical Risk Blocks Execution**: A calculated risk score in the `CRITICAL` tier ($\ge 75$) triggers an automatic block.
5. **Environment Mismatch Resolution**: Releases must follow sequential promotional tiers (e.g., QA → STAGING → PROD) unless explicitly permitted.
6. **Approval Integrity & Expiry**: An expired approval or a plan whose hash does not match current state is invalid.
7. **Destructive Actions Safeguard**: Releases with destructive components require explicit dual confirmation.

## Input Schema
```json
{
  "releaseId": "string",
  "policyOverrides": "object (optional - for policy simulation only)"
}
```

## Output Schema
```json
{
  "releaseId": "string",
  "overallVerdict": "PASS | WARNING | BLOCK",
  "isBlocked": "boolean",
  "evaluations": [
    {
      "ruleId": "string",
      "ruleName": "string",
      "verdict": "PASS | WARNING | BLOCK",
      "reason": "string",
      "details": "string"
    }
  ],
  "blockingReasons": ["string"],
  "evaluatedAt": "string"
}
```

## Anti-Override Directive
- An AI Agent or Skill is strictly forbidden from bypassing a `BLOCK` verdict.
- Administrative overrides require authenticated human executive credentials and are recorded in immutable audit logs.
