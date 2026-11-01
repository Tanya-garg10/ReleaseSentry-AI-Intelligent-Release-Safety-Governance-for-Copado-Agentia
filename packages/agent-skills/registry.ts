import { AgentSkillMetadata } from './skill-types.ts';
import { skillLoader } from './skill-loader.ts';
import { skillExecutor } from './skill-executor.ts';
import { SkillExecutionRepo, AuditRepo } from '../core/src/database/db.ts';

export interface RegisteredSkill extends AgentSkillMetadata {
  executionCount: number;
  lastExecutedAt?: string;
  status: 'ACTIVE' | 'IDLE' | 'DEPRECATED';
  handler: (input: any) => Promise<any>;
}

export class SkillRegistry {
  private skills: Map<string, RegisteredSkill> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Register available skills and attach handlers
   */
  initialize() {
    const discovered = skillLoader.discoverSkills();

    const handlers: Record<string, (input: any) => Promise<any>> = {
      'release-inspection': (i) => skillExecutor.executeReleaseInspection(i),
      'release-risk-analysis': (i) => skillExecutor.executeReleaseRiskAnalysis(i),
      'release-policy-validation': (i) => skillExecutor.executeReleasePolicyValidation(i),
      'safe-release-execution': (i) => skillExecutor.executeSafeReleaseExecution(i),
      'incident-investigation': (i) => skillExecutor.executeIncidentInvestigation(i),
      'release-remediation': (i) => skillExecutor.executeReleaseRemediation(i)
    };

    // Calculate execution stats from db
    const history = SkillExecutionRepo.getAll(500);

    for (const meta of discovered) {
      const execs = history.filter(h => h.skillId === meta.id);
      const count = execs.length;
      const lastExec = execs.length > 0 ? execs[0].startedAt : undefined;

      this.skills.set(meta.id, {
        ...meta,
        executionCount: count,
        lastExecutedAt: lastExec,
        status: 'ACTIVE',
        handler: handlers[meta.id] || (async () => { throw new Error(`No handler registered for skill ${meta.id}`); })
      });
    }
  }

  /**
   * Get all registered skills
   */
  getAllSkills(): RegisteredSkill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skill by ID
   */
  getSkill(skillId: string): RegisteredSkill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Execute skill and record history in SQLite
   */
  async executeSkill(skillId: string, input: any, triggeredBy = 'User / Dashboard') {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found in registry: ${skillId}`);
    }

    const executionId = `SKX-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const startTime = Date.now();
    const isoStart = new Date(startTime).toISOString();

    try {
      const output = await skill.handler(input);
      const durationMs = Date.now() - startTime;
      const isoEnd = new Date().toISOString();

      // Update registry stats
      skill.executionCount++;
      skill.lastExecutedAt = isoEnd;

      // Persist execution
      SkillExecutionRepo.record({
        id: executionId,
        skillId: skill.id,
        skillName: skill.name,
        releaseId: input?.releaseId || undefined,
        triggeredBy,
        startedAt: isoStart,
        completedAt: isoEnd,
        status: 'SUCCESS',
        inputs: input,
        outputs: output,
        durationMs
      });

      AuditRepo.record({
        releaseId: input?.releaseId,
        action: `SKILL_EXECUTED_${skill.id.toUpperCase().replace(/-/g, '_')}`,
        actor: `Skill: ${skill.name}`,
        actorType: 'AGENT',
        timestamp: isoEnd,
        details: { skillId: skill.id, durationMs, inputSummary: Object.keys(input || {}) },
        verdict: 'SUCCESS'
      });

      return {
        executionId,
        skillId: skill.id,
        skillName: skill.name,
        status: 'SUCCESS',
        durationMs,
        output
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const isoEnd = new Date().toISOString();

      SkillExecutionRepo.record({
        id: executionId,
        skillId: skill.id,
        skillName: skill.name,
        releaseId: input?.releaseId || undefined,
        triggeredBy,
        startedAt: isoStart,
        completedAt: isoEnd,
        status: 'FAILED',
        inputs: input,
        outputs: {},
        durationMs,
        errorMessage: err.message
      });

      AuditRepo.record({
        releaseId: input?.releaseId,
        action: `SKILL_FAILED_${skill.id.toUpperCase().replace(/-/g, '_')}`,
        actor: `Skill: ${skill.name}`,
        actorType: 'AGENT',
        timestamp: isoEnd,
        details: { skillId: skill.id, durationMs, error: err.message },
        verdict: 'BLOCK'
      });

      throw err;
    }
  }
}

export const skillRegistry = new SkillRegistry();
