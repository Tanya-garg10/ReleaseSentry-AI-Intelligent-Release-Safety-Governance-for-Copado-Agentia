import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Bot,
  Activity,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { Release, SystemStats, AuditEvent, SkillExecution } from '../../types.ts';

interface OverviewViewProps {
  stats: SystemStats | null;
  releases: Release[];
  audits: AuditEvent[];
  skillHistory: SkillExecution[];
  onNavigateTab: (tab: any) => void;
  onOpenStandoutDemo: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  stats,
  releases,
  audits,
  skillHistory,
  onNavigateTab,
  onOpenStandoutDemo
}) => {
  // Compute chart datasets
  const riskDistribution = [
    { name: 'Low Risk', count: releases.filter(r => (r.riskScore ?? 0) <= 25).length, color: '#10B981' },
    { name: 'Medium Risk', count: releases.filter(r => (r.riskScore ?? 0) > 25 && (r.riskScore ?? 0) <= 50).length, color: '#3B82F6' },
    { name: 'High Risk', count: releases.filter(r => (r.riskScore ?? 0) > 50 && (r.riskScore ?? 0) <= 75).length, color: '#F59E0B' },
    { name: 'Critical Risk', count: releases.filter(r => (r.riskScore ?? 0) > 75).length, color: '#EF4444' }
  ];

  const envDistribution = [
    { name: 'DEV', count: releases.filter(r => r.targetEnvironment === 'DEV').length },
    { name: 'QA', count: releases.filter(r => r.targetEnvironment === 'QA').length },
    { name: 'UAT', count: releases.filter(r => r.targetEnvironment === 'UAT').length },
    { name: 'STAGING', count: releases.filter(r => r.targetEnvironment === 'STAGING').length },
    { name: 'PROD', count: releases.filter(r => r.targetEnvironment === 'PROD').length }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Standout Walkthrough Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Inspect. Analyze. Govern. Release with Confidence.
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            AI agents shouldn't simply execute release actions. ReleaseSentry AI orchestrates reusable Agent Skills to inspect release evidence, calculate explainable risk scores, enforce policy guardrails, and mandate human sign-offs before deployment.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={onOpenStandoutDemo}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>Launch RLS-104 Live Demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Releases</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {stats?.totalReleases ?? releases.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Across 5 org tiers</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-emerald-700 font-medium">Safe Releases</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">
            {stats?.safeReleases ?? releases.filter(r => (r.riskScore ?? 0) <= 50).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span>Certified ready for deploy</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-red-700 font-medium">Blocked by Policy</div>
          <div className="text-2xl font-bold text-red-600 mt-1 tabular-nums">
            {stats?.blockedReleases ?? releases.filter(r => r.status === 'BLOCKED').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span>Actionable remediation active</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-amber-700 font-medium">Critical Risks</div>
          <div className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">
            {stats?.criticalRisks ?? releases.filter(r => (r.riskScore ?? 0) >= 76).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span>Score ≥ 76 / 100</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-blue-700 font-medium">Pending Approvals</div>
          <div className="text-2xl font-bold text-blue-600 mt-1 tabular-nums">
            {stats?.pendingApprovals ?? 1}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span>Human-in-the-loop gate</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Release Risk Distribution</h2>
              <p className="text-xs text-slate-500 mt-0.5">Deterministic 0–100 score clustering</p>
            </div>
            <button
              onClick={() => onNavigateTab('releases')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', color: '#FFF', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#93C5FD' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Target Environment Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Target Environment Pipeline</h2>
              <p className="text-xs text-slate-500 mt-0.5">Release volume queued across org tiers</p>
            </div>
            <button
              onClick={() => onNavigateTab('releases')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <span>View Releases</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={envDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', color: '#FFF', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two Column Bottom Grid: Active Releases & Skill Execution Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: High-Interest Releases Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Governed Releases Pipeline</h2>
              <p className="text-xs text-slate-500">Continuous risk and policy gate evaluation</p>
            </div>
            <button
              onClick={() => onNavigateTab('releases')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              See all ({releases.length})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Release ID</th>
                  <th className="py-2.5 px-4">Title & Components</th>
                  <th className="py-2.5 px-4">Target</th>
                  <th className="py-2.5 px-4 text-center">Risk Score</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {releases.slice(0, 5).map(rel => {
                  const isBlocked = rel.status === 'BLOCKED' || rel.status === 'FAILED';
                  return (
                    <tr key={rel.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {rel.id}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{rel.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span>{rel.components.length} components</span>
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span>{rel.projectName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-slate-700">{rel.sourceEnvironment} → {rel.targetEnvironment}</span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`font-mono font-bold text-xs ${
                          (rel.riskScore ?? 0) > 75
                            ? 'text-red-600'
                            : (rel.riskScore ?? 0) > 50
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                        }`}>
                          {rel.riskScore ?? 0}/100
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`font-semibold text-[11px] ${
                          isBlocked
                            ? 'text-red-700'
                            : rel.status === 'APPROVED'
                              ? 'text-emerald-700'
                              : 'text-slate-700'
                        }`}>
                          {rel.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {rel.id === 'RLS-104' ? (
                          <button
                            onClick={onOpenStandoutDemo}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            Live Demo Flow
                          </button>
                        ) : (
                          <button
                            onClick={() => onNavigateTab('releases')}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            Inspect
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Real-Time Agent Skill Executions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Skill Executions</h2>
              </div>
              <button
                onClick={() => onNavigateTab('skills')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Skill Center
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {skillHistory.slice(0, 5).map((exec, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{exec.skillName}</span>
                    <span className="text-[10px] font-mono text-slate-500 tabular-nums">{exec.durationMs}ms</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                    <span className="font-mono text-slate-700">{exec.releaseId || 'Global'}</span>
                    <span className="text-slate-300">·</span>
                    <span>Trigger: {exec.triggeredBy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('audit')}
              className="w-full py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <span>Explore Complete Audit Trail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
