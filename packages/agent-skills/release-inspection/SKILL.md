---
name: "release-inspection"
description: "Inspect a proposed software release and collect structured evidence, components, and missing information."
version: "1.2.0"
category: "governance"
author: "ReleaseSentry Agent Skills"
---

# Release Inspection Skill

## Purpose
Inspect a proposed software release before any governance, risk scoring, or execution actions occur. This skill collects release metadata, identifies source and target environments, inspects changed components, verifies test evidence, identifies dependency links, and explicitly flags missing or unknown fields.

## Responsibilities
1. **Metadata Collection**: Extract release ID, title, branch, version, and timestamps.
2. **Environment Verification**: Identify source and target environments, detecting cross-tier anomalies (e.g. DEV directly targeting PROD).
3. **Component Analysis**: Inspect all changed components (Apex, Flows, Custom Objects, Lightning Web Components) and classify destructive modifications.
4. **Evidence Gathering**: Check automated test run reports, code coverage, dependency scan reports, and security scans.
5. **Unknown Evidence Detection**: Identify missing documentation or untested changes. Never assume or hallucinate missing data.

## Input Schema
```json
{
  "releaseId": "string",
  "deepScan": "boolean (optional, default: true)"
}
```

## Output Schema
```json
{
  "releaseId": "string",
  "status": "string",
  "sourceEnvironment": "string",
  "targetEnvironment": "string",
  "componentSummary": {
    "total": "number",
    "destructive": "number",
    "types": "object"
  },
  "evidence": {
    "testsFound": "boolean",
    "testPassed": "boolean",
    "coveragePercent": "number",
    "dependenciesVerified": "boolean",
    "securityClean": "boolean"
  },
  "missingEvidenceFields": ["string"],
  "warnings": ["string"],
  "inspectedAt": "string"
}
```

## Governance Constraints
- Never fabricate test or security evidence. If a field has not been provided, mark it as `UNKNOWN`.
- Flag all destructive operations (`DELETE` or schema drops) with explicit warnings.
- Output from this skill feeds directly into `release-risk-analysis`.
