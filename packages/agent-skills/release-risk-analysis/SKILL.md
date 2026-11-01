---
name: "release-risk-analysis"
description: "Analyze release risk using inspection evidence and calculate explainable scores with traceable findings."
version: "1.2.0"
category: "risk"
author: "ReleaseSentry Agent Skills"
---

# Release Risk Analysis Skill

## Purpose
Analyze the operational, technical, and regulatory risk of a proposed software release using structured evidence from `release-inspection`. Calculates a deterministic, explainable risk score (0–100) and assigns an explicit risk classification (`LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`).

## Responsibilities
1. **Evidence Evaluation**:
   - Evaluate missing or failing test evidence.
   - Detect environment mismatch (e.g., DEV → PROD skips QA/STAGING).
   - Evaluate unverified third-party dependencies or missing packages.
   - Account for destructive components (dropped fields/classes).
   - Check security vulnerability findings.
2. **Explainable Scoring (0–100)**:
   - Low: 0–25
   - Medium: 26–50
   - High: 51–75
   - Critical: 76–100
3. **Structured Finding Generation**: Every finding must specify:
   - Finding title
   - Severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
   - Category (`TESTING`, `ENVIRONMENT`, `DEPENDENCY`, `SECURITY`, `APPROVAL`, `GOVERNANCE`)
   - Concrete evidence string or explicit `UNKNOWN` marker
   - Exact numerical risk contribution
   - Recommended remediation action

## Input Schema
```json
{
  "releaseId": "string",
  "inspectionResult": "object (optional - if omitted, skill loads latest inspection from repository)"
}
```

## Output Schema
```json
{
  "releaseId": "string",
  "score": "number (0-100)",
  "level": "LOW | MEDIUM | HIGH | CRITICAL",
  "findings": [
    {
      "id": "string",
      "title": "string",
      "severity": "string",
      "category": "string",
      "evidence": "string",
      "riskContribution": "number",
      "recommendedRemediation": "string",
      "isUnknown": "boolean"
    }
  ],
  "summary": "string",
  "evaluatedAt": "string"
}
```

## Traceability Rules
- Avoid double-counting the same underlying flaw.
- Missing evidence is penalized under governance certainty, never silently ignored.
- Output feeds directly into `release-policy-validation`.
