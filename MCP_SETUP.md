# Model Context Protocol (MCP) Setup Guide

## Overview

ReleaseSentry AI implements a compliant Model Context Protocol server using the official `@modelcontextprotocol/sdk`. This allows external AI assistants (such as Claude Desktop, Copado Agentia background agents, or custom MCP clients) to govern releases headlessly.

---

## Configuration for Claude Desktop or MCP Client

Add the following configuration to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "releasesentry": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/packages/mcp-server/index.ts"],
      "env": {
        "PORT": "3000"
      }
    }
  }
}
```

---

## Available MCP Tools

1. `inspect_release`: Collect release components, promotion tiers, and test evidence.
2. `analyze_release_risk`: Calculate explainable 0–100 risk score and findings.
3. `validate_release_policy`: Evaluate active policy gates (PASS, WARNING, BLOCK).
4. `generate_release_plan`: Generate SHA-256 release plan hash and component manifest.
5. `get_release_status`: Run multi-skill assessment and return overall readiness.
6. `request_release_approval`: Request human sign-off for release.
7. `execute_approved_release`: Safely deploy approved release via adapter.
8. `analyze_incident`: Investigate post-deployment failures and error logs.
9. `export_audit_report`: Retrieve immutable audit logs.
10. `list_agent_skills`: Enumerate all 6 discovered Agent Skills.
11. `run_agent_skill`: Invoke any registered Agent Skill directly by ID.
