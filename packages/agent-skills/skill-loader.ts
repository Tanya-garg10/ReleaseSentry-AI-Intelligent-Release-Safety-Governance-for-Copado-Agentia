import fs from 'node:fs';
import path from 'node:path';
import { AgentSkillMetadata } from './skill-types.ts';

export class SkillLoader {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'packages/agent-skills');
  }

  /**
   * Discover and parse all SKILL.md files in subdirectories
   */
  discoverSkills(): AgentSkillMetadata[] {
    if (!fs.existsSync(this.baseDir)) {
      return [];
    }

    const items = fs.readdirSync(this.baseDir, { withFileTypes: true });
    const skills: AgentSkillMetadata[] = [];

    for (const item of items) {
      if (item.isDirectory()) {
        const skillPath = path.join(this.baseDir, item.name, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          const content = fs.readFileSync(skillPath, 'utf8');
          const skill = this.parseSkillMarkdown(item.name, skillPath, content);
          if (skill) {
            skills.push(skill);
          }
        }
      }
    }

    return skills;
  }

  /**
   * Parse YAML frontmatter and markdown
   */
  private parseSkillMarkdown(folderName: string, filePath: string, content: string): AgentSkillMetadata {
    let name = folderName;
    let description = '';
    let version = '1.0.0';
    let category = 'general';
    let author = 'ReleaseSentry';

    const frontmatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
    if (frontmatterMatch) {
      const yaml = frontmatterMatch[1];
      const nameMatch = yaml.match(/name:\s*["']?([^"'\n]+)["']?/);
      if (nameMatch) name = nameMatch[1].trim();

      const descMatch = yaml.match(/description:\s*["']?([^"'\n]+)["']?/);
      if (descMatch) description = descMatch[1].trim();

      const verMatch = yaml.match(/version:\s*["']?([^"'\n]+)["']?/);
      if (verMatch) version = verMatch[1].trim();

      const catMatch = yaml.match(/category:\s*["']?([^"'\n]+)["']?/);
      if (catMatch) category = catMatch[1].trim();

      const authMatch = yaml.match(/author:\s*["']?([^"'\n]+)["']?/);
      if (authMatch) author = authMatch[1].trim();
    }

    return {
      id: folderName,
      name,
      description,
      version,
      category,
      author,
      skillPath: filePath,
      markdownDoc: content,
      inputSchemaDescription: `Schema defined in ${name}/SKILL.md and skill-types.ts`,
      outputSchemaDescription: `Validated by Zod schema for ${name}`
    };
  }
}

export const skillLoader = new SkillLoader();
