import React, { useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Plus,
  Layers,
  FileCode,
  Box
} from 'lucide-react';
import { Release, EnvironmentType, ReleaseStatus } from '../../types.ts';
import { api } from '../../api.ts';

interface ReleaseIntelligenceViewProps {
  releases: Release[];
  onRefresh: () => void;
  onOpenStandoutDemo: () => void;
}

export const ReleaseIntelligenceView: React.FC<ReleaseIntelligenceViewProps> = ({
  releases,
  onRefresh,
  onOpenStandoutDemo
}) => {
  const [selectedEnv, setSelectedEnv] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeRelease, setActiveRelease] = useState<Release | null>(releases[0] || null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filter releases
  const filtered = releases.filter(r => {
    const matchesEnv = selectedEnv === 'ALL' || r.targetEnvironment === selectedEnv;
    const matchesStatus = selectedStatus === 'ALL' || r.status === selectedStatus;
    const matchesSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEnv && matchesStatus && matchesSearch;
  });

  const handleInspect = async (id: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await api.inspectRelease(id);
      setActionMessage(`✓ release-inspection skill finished for ${id}. Total components: ${res.output.componentSummary.total}`);
      onRefresh();
    } catch (err: any) {
      setActionMessage(`❌ Inspection error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnalyzeRisk = async (id: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await api.analyzeRisk(id);
      setActionMessage(`✓ release-risk-analysis calculated score ${res.output.score}/100 (${res.output.level})`);
      onRefresh();
    } catch (err: any) {
      setActionMessage(`❌ Risk analysis error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidatePolicy = async (id: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await api.validatePolicy(id);
      setActionMessage(`✓ Policy evaluation verdict: ${res.output.overallVerdict} (Blocked: ${res.output.isBlocked ? 'YES' : 'NO'})`);
      onRefresh();
    } catch (err: any) {
      setActionMessage(`❌ Policy validation error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecute = async (id: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await api.executeRelease(id, 'Console Operator', true);
      setActionMessage(`✓ Release executed successfully through Copado Agentia adapter (Execution: ${res.output.executionId})`);
      onRefresh();
    } catch (err: any) {
      setActionMessage(`❌ Execution blocked: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search release ID, component, project..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-900 focus:outline-blue-600"
            />
          </div>

          {/* Environment Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
            {['ALL', 'PROD', 'STAGING', 'UAT', 'QA', 'DEV'].map(env => (
              <button
                key={env}
                onClick={() => setSelectedEnv(env)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedEnv === env
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                {env}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-blue-600 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="INSPECTED">INSPECTED</option>
            <option value="ANALYZED">ANALYZED</option>
            <option value="VALIDATED">VALIDATED</option>
            <option value="AWAITING_APPROVAL">AWAITING_APPROVAL</option>
            <option value="APPROVED">APPROVED</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
          </select>

          <button
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh Releases"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-blue-500 hover:text-blue-800 text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Release List & Selected Release Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List: 7 Cols */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Releases ({filtered.length})
            </h2>
            <span className="text-xs text-slate-500">Click a release to inspect evidence manifest</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
            {filtered.map(rel => {
              const isSelected = activeRelease?.id === rel.id;
              const isBlocked = rel.status === 'BLOCKED' || rel.status === 'FAILED';
              return (
                <div
                  key={rel.id}
                  onClick={() => setActiveRelease(rel)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/60 border-l-4 border-l-blue-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-xs">{rel.id}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500 font-medium">{rel.projectName}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] font-mono text-slate-600">{rel.sourceEnvironment} → {rel.targetEnvironment}</span>
                      </div>
                      <h3 className="text-xs font-semibold text-slate-900 mt-1 line-clamp-1">{rel.title}</h3>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className={`font-mono font-bold text-xs ${
                        (rel.riskScore ?? 0) > 75
                          ? 'text-red-600'
                          : (rel.riskScore ?? 0) > 50
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      }`}>
                        {rel.riskScore ?? 0}/100
                      </span>
                      <span className={`text-[10px] font-semibold mt-0.5 ${
                        isBlocked ? 'text-red-700' : 'text-slate-600'
                      }`}>
                        {rel.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2.5 text-[11px] text-slate-500">
                    <span>{rel.components.length} components</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {rel.evidence.tests.hasRun
                        ? `${rel.evidence.tests.codeCoveragePercent}% test coverage`
                        : 'No test evidence'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">Hash: {rel.planHash.substring(0, 8)}...</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Inspector Drawer: 5 Cols */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          {activeRelease ? (
            <div className="space-y-5">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {activeRelease.id}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{activeRelease.version}</span>
                  </div>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                    (activeRelease.riskScore ?? 0) > 75
                      ? 'bg-red-50 text-red-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    Risk: {activeRelease.riskScore ?? 0}/100 ({activeRelease.riskLevel || 'LOW'})
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-2">{activeRelease.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{activeRelease.description}</p>
              </div>

              {/* Promotional Path & Plan Hash */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Promotion Route:</span>
                  <span className="font-mono font-semibold text-slate-800">{activeRelease.sourceEnvironment} → {activeRelease.targetEnvironment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Source Branch:</span>
                  <span className="font-mono text-slate-700">{activeRelease.sourceBranch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SHA-256 Plan Hash:</span>
                  <span className="font-mono text-slate-800 font-semibold">{activeRelease.planHash}</span>
                </div>
              </div>

              {/* Component Manifest */}
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Changed Components ({activeRelease.components.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {activeRelease.components.filter(c => c.isDestructive || c.action === 'DELETE').length} destructive
                  </span>
                </div>
                <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {activeRelease.components.map((comp, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 text-xs font-mono">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          comp.action === 'DELETE'
                            ? 'bg-red-100 text-red-700'
                            : comp.action === 'ADD'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}>
                          {comp.action}
                        </span>
                        <span className="text-slate-800 truncate">{comp.name}</span>
                      </div>
                      <span className="text-slate-500 text-[11px] shrink-0">{comp.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence Inspection Summary */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Evidence Bundle Manifest
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Apex Unit Tests</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {activeRelease.evidence.tests.hasRun
                        ? `${activeRelease.evidence.tests.totalTests} tests (${activeRelease.evidence.tests.codeCoveragePercent}% cov)`
                        : 'No Test Run Found'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Dependencies</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {activeRelease.evidence.dependencies.unresolvedCount === 0
                        ? 'All Verified'
                        : `${activeRelease.evidence.dependencies.unresolvedCount} Unresolved`}
                    </span>
                  </div>
                </div>

                {activeRelease.evidence.missingEvidenceFields?.length > 0 && (
                  <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-xs text-amber-900">
                    <span className="font-semibold block mb-0.5">Missing Required Evidence:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {activeRelease.evidence.missingEvidenceFields.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleInspect(activeRelease.id)}
                    disabled={actionLoading}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-semibold transition-colors truncate"
                  >
                    Inspect
                  </button>
                  <button
                    onClick={() => handleAnalyzeRisk(activeRelease.id)}
                    disabled={actionLoading}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-semibold transition-colors truncate"
                  >
                    Analyze Risk
                  </button>
                  <button
                    onClick={() => handleValidatePolicy(activeRelease.id)}
                    disabled={actionLoading}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-semibold transition-colors truncate"
                  >
                    Validate Policy
                  </button>
                </div>

                {activeRelease.id === 'RLS-104' ? (
                  <button
                    onClick={onOpenStandoutDemo}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>Run Standout Remediation & Approval Flow</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : activeRelease.status === 'APPROVED' ? (
                  <button
                    onClick={() => handleExecute(activeRelease.id)}
                    disabled={actionLoading}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Execute Approved Release via Copado Adapter</span>
                  </button>
                ) : (
                  <div className="text-center text-[11px] text-slate-500 py-1">
                    Status: <span className="font-semibold text-slate-700">{activeRelease.status}</span>. Policy gates require full compliance and human approval before execution.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Box className="w-10 h-10 mb-2 text-slate-300" />
              <span>Select a release from the pipeline list to inspect evidence.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
