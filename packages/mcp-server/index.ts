import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  ReleaseRepo,
  RiskRepo,
  PolicyRepo,
  ApprovalRepo,
  ExecutionRepo,
  IncidentRepo,
  AuditRepo
} from '../core/src/database/db.ts';
import { seedDatabase, calculatePlanHash } from '../core/src/database/seed.ts';
import { skillRegistry } from '../agent-skills/registry.ts';
import { agentSkillsOrchestrator } from '../agent-skills/orchestrator.ts';

seedDatabase();

const server = new Server(
  {
    name: 'releasesentry-mcp',
    version: '1.2.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Define tool list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'inspect_release',
        description: 'Inspect a release to collect metadata, changed components, test runs, and identify missing evidence.',
        inputSchema: {
          type: 'object',
          properties: {
            releaseId: { type: 'string', description: 'The release ID (e.g. RLS-104)' },
            deepScan: { type: 'boolean', description: 'Whether to perform deep component inspection', default: true }
          },
          required: ['releaseId']
        }
      },
      {
        name: 'analyze_release_risk',
        description: 'Analyze release risk score (0-100) and generate traceable findings using evidence from inspection.',
        inputSchema: {
          type: 'object',
          properties: {
            releaseId: { type: 'string', description: 'The release ID to analyze' }
          },
          required: ['releaseId']
        }
      },
      {
        name: 'validate_release_policy',
        description: 'Validate release against active organizational governance policies (returns PASS, WARNING, or BLOCK).',
        inputSchema: {
          type: 'object',
          properties: {
            releaseId: { type: 'string', description: 'The release ID to validate' }
          },
          required: ['releaseId']
        }
      },
      {
        name: 'generate_release_plan',
        description: 'Generate or inspect the SHA-256 cryptographic release plan hash and component manifest.',
        inputSchema: {
          type: 'object',
          properties: {
            releaseId: { type: 'string', description: 'The release ID' }
          },
          required: ['releaseId']
        }
      },
      {
        name: 'get_release_status',
        description: 'Get comprehensive release readiness status, orchestrating all skills and policy evaluations.',
        inputSchema: {
          type: 'object',
          properties: {
            releaseId: { type: 'string', description: 'The release ID' }
          },
          required: ['releaseId']
        }
      },
      {
        name: 'request_release_approval',
        description: 'Request or record human authorization for a release. Agent cannot self-approve production releases.',
        inputSchema: {
          type: 'object',
          properties: {
            releaseId: { type: 'string', description: 'The release ID' },
            approverName: { type: 'string', description: 'Name of the human approver' },
            notes: { type: 'string', description: 'Approval justification or review notes' }
          },
          required: ['releaseId', 'approverName']
        }
      },
      {
        name: 'execute_approved_release',
        description: 'Safely execute an approved release through Copado Agentia adapter after mandatory pre-flight checks.',
        inputSchema: {
          type: 'object',
          properties: {
            releaseId: { type: 'string', description: 'The release ID' },
            executedBy: { type: 'string', description: 'Operator or Agent identity executing the release' },
            humanConfirmed: { type: 'boolean', description: 'Confirmation acknowledging production release' }
          },
          required: ['releaseId']
        }
      },
      {
        name: 'analyze_incident',
        description: 'Investigate a failed deployment incident, isolate failure point, and formulate remediation hypotheses.',
        inputSchema: {
          type: 'object',
          properties: {
            incidentId: { type: 'string', description: 'Incident ID (e.g. INC-901)' },
            releaseId: { type: 'string', description: 'Optional associated release ID' }
          }
        }
      },
      {
        name: 'export_audit_report',
        description: 'Export immutable release audit trail and governance decision records.',
        inputSchema: {
          type: 'object',
          properties: {
            releaseId: { type: 'string', description: 'Optional filter by release ID' }
          }
        }
      },
      {
        name: 'list_agent_skills',
        description: 'List all available Agent Skills, versions, descriptions, and execution histories.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'run_agent_skill',
        description: 'Run any registered Agent Skill directly by skill ID with parameters.',
        inputSchema: {
          type: 'object',
          properties: {
            skillId: { type: 'string', description: 'Skill ID (e.g. release-inspection, release-remediation)' },
            params: { type: 'object', description: 'Parameters for the skill' }
          },
          required: ['skillId', 'params']
        }
      }
    ]
  };
});

// Tool invocation handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'inspect_release': {
        const releaseId = String(args.releaseId);
        const res = await skillRegistry.executeSkill('release-inspection', { releaseId, deepScan: args.deepScan ?? true }, 'MCP');
        return { content: [{ type: 'text', text: JSON.stringify(res.output, null, 2) }] };
      }

      case 'analyze_release_risk': {
        const releaseId = String(args.releaseId);
        const res = await skillRegistry.executeSkill('release-risk-analysis', { releaseId }, 'MCP');
        return { content: [{ type: 'text', text: JSON.stringify(res.output, null, 2) }] };
      }

      case 'validate_release_policy': {
        const releaseId = String(args.releaseId);
        const res = await skillRegistry.executeSkill('release-policy-validation', { releaseId }, 'MCP');
        return { content: [{ type: 'text', text: JSON.stringify(res.output, null, 2) }] };
      }

      case 'generate_release_plan': {
        const releaseId = String(args.releaseId);
        const release = ReleaseRepo.getById(releaseId);
        if (!release) throw new Error(`Release not found: ${releaseId}`);
        const hash = calculatePlanHash(release);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ releaseId, version: release.version, planHash: hash, componentCount: release.components.length }, null, 2)
          }]
        };
      }

      case 'get_release_status': {
        const releaseId = String(args.releaseId);
        const report = await agentSkillsOrchestrator.assessReleaseReadiness(releaseId, 'MCP');
        return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] };
      }

      case 'request_release_approval': {
        const releaseId = String(args.releaseId);
        const release = ReleaseRepo.getById(releaseId);
        if (!release) throw new Error(`Release not found: ${releaseId}`);
        const hash = calculatePlanHash(release);
        const approverName = String(args.approverName || 'Authorized Engineer');
        const app = {
          id: `APP-MCP-${Date.now().toString(36)}`,
          releaseId,
          releasePlanHash: hash,
          approverId: 'USR-MCP',
          approverName,
          approverEmail: 'approver@enterprise.internal',
          approverRole: 'Authorized Signer',
          status: 'APPROVED' as const,
          requestedAt: new Date().toISOString(),
          decisionAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
          notes: String(args.notes || 'Approved via Model Context Protocol')
        };
        ApprovalRepo.save(app);
        release.status = 'APPROVED';
        ReleaseRepo.save(release);
        return { content: [{ type: 'text', text: JSON.stringify(app, null, 2) }] };
      }

      case 'execute_approved_release': {
        const releaseId = String(args.releaseId);
        const res = await skillRegistry.executeSkill('safe-release-execution', {
          releaseId,
          executedBy: String(args.executedBy || 'MCP Autonomous Operator'),
          humanConfirmed: Boolean(args.humanConfirmed)
        }, 'MCP');
        return { content: [{ type: 'text', text: JSON.stringify(res.output, null, 2) }] };
      }

      case 'analyze_incident': {
        const res = await skillRegistry.executeSkill('incident-investigation', {
          incidentId: args.incidentId ? String(args.incidentId) : undefined,
          releaseId: args.releaseId ? String(args.releaseId) : undefined
        }, 'MCP');
        return { content: [{ type: 'text', text: JSON.stringify(res.output, null, 2) }] };
      }

      case 'export_audit_report': {
        const audits = AuditRepo.getAll(100);
        const filtered = args.releaseId ? audits.filter(a => a.releaseId === args.releaseId) : audits;
        return { content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }] };
      }

      case 'list_agent_skills': {
        const skills = skillRegistry.getAllSkills();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(skills.map(s => ({
              id: s.id,
              name: s.name,
              version: s.version,
              category: s.category,
              executionCount: s.executionCount,
              status: s.status
            })), null, 2)
          }]
        };
      }

      case 'run_agent_skill': {
        const skillId = String(args.skillId);
        const params = (args.params as Record<string, any>) || {};
        const res = await skillRegistry.executeSkill(skillId, params, 'MCP');
        return { content: [{ type: 'text', text: JSON.stringify(res.output, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error in tool ${name}: ${error.message}` }]
    };
  }
});

export async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ReleaseSentry AI MCP Server running on stdio');
}

if (process.argv[1]?.endsWith('packages/mcp-server/index.ts')) {
  startMcpServer().catch(err => {
    console.error('Failed to start MCP server:', err);
    process.exit(1);
  });
}
