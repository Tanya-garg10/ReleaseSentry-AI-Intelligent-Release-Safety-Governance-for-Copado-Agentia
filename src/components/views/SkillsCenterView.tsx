import React, { useState } from 'react';
import {
  Bot,
  Play,
  FileCode,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Terminal,
  ChevronRight,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { AgentSkill, SkillExecution, Release } from '../../types.ts';
import { api } from '../../api.ts';

interface SkillsCenterViewProps {
  skills: AgentSkill[];
  skillHistory: SkillExecution[];
  releases: Release[];
  onRefresh: () => void;
}

export const SkillsCenterView: React.FC<SkillsCenterViewProps> = ({
  skills,
  skillHistory,
  releases,
  onRefresh
}) => {
  const [selectedSkill, setSelectedSkill] = useState<AgentSkill | null>(skills[0] || null);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>(releases[0]?.id || 'RLS-104');
  const [running, setRunning] = useState<boolean>(false);
  const [executionOutput, setExecutionOutput] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'CONSOLE' | 'DOCUMENTATION'>('CONSOLE');

  const handleRunSkill = async () => {
    if (!selectedSkill) return;
    setRunning(true);
    setExecutionOutput(null);
    try {
      const res = await api.runSkill(selectedSkill.id, {
        releaseId: selectedReleaseId,
        deepScan: true
      });
      setExecutionOutput(res);
      onRefresh();
    } catch (err: any) {
      setExecutionOutput({ error: err.message, status: 'FAILED' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Agent Skills Architecture</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-mono">packages/agent-skills/</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            Agent Skills Center & Execution Engine
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600">
            <button
              onClick={() => setViewMode('CONSOLE')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'CONSOLE' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Interactive Console
            </button>
            <button
              onClick={() => setViewMode('DOCUMENTATION')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'DOCUMENTATION' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              SKILL.md Docs Viewer
            </button>
          </div>
          <button onClick={onRefresh} className="p-2 text-slate-500 hover:text-slate-900 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid: 6 Skills Cards + Active Runner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Skills Selection List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Registered Agent Skills ({skills.length})
          </h3>

          <div className="space-y-2">
            {skills.map(s => {
              const isSelected = selectedSkill?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedSkill(s);
                    setExecutionOutput(null);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">{s.name}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                      {s.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {s.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-100/80 mt-3">
                    <span className="font-mono">v{s.version}</span>
                    <span className="tabular-nums font-mono">
                      {s.executionCount} executions
                    </span>
                    <span>
                      {s.lastExecutedAt ? new Date(s.lastExecutedAt).toLocaleTimeString() : 'Never run'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Skill Workbench / SKILL.md Docs Viewer (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          {selectedSkill ? (
            viewMode === 'CONSOLE' ? (
              <div className="space-y-5">
                {/* Header */}
                <div className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-600">
                      packages/agent-skills/{selectedSkill.id}/
                    </span>
                    <span className="text-xs font-mono text-slate-400">Category: {selectedSkill.category}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{selectedSkill.name}</h3>
                  <p className="text-xs text-slate-600 mt-1">{selectedSkill.description}</p>
                </div>

                {/* Input Controls */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">Execution Parameters</span>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">Target Release</label>
                      <select
                        value={selectedReleaseId}
                        onChange={e => setSelectedReleaseId(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium"
                      >
                        {releases.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.id}: {r.title} ({r.targetEnvironment})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleRunSkill}
                      disabled={running}
                      className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
                    >
                      {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      <span>Execute Skill</span>
                    </button>
                  </div>
                </div>

                {/* Execution Output Console */}
                <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Skill Structured Output (Validated by Zod)</span>
                    </div>
                    {executionOutput?.durationMs && (
                      <span className="text-slate-400 text-[10px] tabular-nums">{executionOutput.durationMs}ms</span>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {running ? (
                      <div className="py-12 text-center text-slate-500">Executing skill handler...</div>
                    ) : executionOutput ? (
                      <pre className="text-[11px] text-emerald-400 whitespace-pre-wrap leading-relaxed">
                        {JSON.stringify(executionOutput, null, 2)}
                      </pre>
                    ) : (
                      <div className="py-12 text-center text-slate-500">
                        Click "Execute Skill" to invoke {selectedSkill.id} and inspect live structured JSON.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Markdown Documentation Viewer */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      packages/agent-skills/{selectedSkill.id}/SKILL.md
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">v{selectedSkill.version}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-[500px] overflow-y-auto text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed">
                  {selectedSkill.markdownDoc}
                </div>
              </div>
            )
          ) : (
            <div className="py-24 text-center text-slate-400 text-xs">
              Select an agent skill from the list.
            </div>
          )}
        </div>
      </div>

      {/* Execution History Table from SQLite */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Skill Execution Ledger (SQLite: skill_executions)
          </h3>
          <span className="text-xs text-slate-500">{skillHistory.length} total logged executions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2 px-4">Execution ID</th>
                <th className="py-2 px-4">Skill Name</th>
                <th className="py-2 px-4">Release</th>
                <th className="py-2 px-4">Triggered By</th>
                <th className="py-2 px-4">Duration</th>
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {skillHistory.slice(0, 8).map(exec => (
                <tr key={exec.id} className="hover:bg-slate-50">
                  <td className="py-2 px-4 font-bold text-slate-900">{exec.id}</td>
                  <td className="py-2 px-4 text-slate-800">{exec.skillName}</td>
                  <td className="py-2 px-4 text-slate-700">{exec.releaseId || '—'}</td>
                  <td className="py-2 px-4 text-slate-500">{exec.triggeredBy}</td>
                  <td className="py-2 px-4 text-slate-700 tabular-nums">{exec.durationMs}ms</td>
                  <td className="py-2 px-4">
                    <span className="text-emerald-700 font-bold">{exec.status}</span>
                  </td>
                  <td className="py-2 px-4 text-right text-slate-400 text-[11px] tabular-nums">
                    {new Date(exec.startedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
