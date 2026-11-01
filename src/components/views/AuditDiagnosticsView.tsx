import React, { useState } from 'react';
import {
  FileText,
  Search,
  Download,
  RefreshCw,
  AlertOctagon,
  Terminal,
  Cpu,
  ChevronDown,
  ChevronRight,
  Play,
  RotateCcw,
  Check,
  Copy
} from 'lucide-react';
import { AuditEvent, Incident, SystemStats } from '../../types.ts';
import { api } from '../../api.ts';

interface AuditDiagnosticsViewProps {
  audits: AuditEvent[];
  incidents: Incident[];
  stats: SystemStats | null;
  onRefresh: () => void;
}

export const AuditDiagnosticsView: React.FC<AuditDiagnosticsViewProps> = ({
  audits,
  incidents,
  stats,
  onRefresh
}) => {
  const [subTab, setSubTab] = useState<'AUDIT' | 'INCIDENTS' | 'SYSTEM'>('AUDIT');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedActorType, setSelectedActorType] = useState<string>('ALL');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // Incidents state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(incidents[0] || null);
  const [investigating, setInvestigating] = useState<boolean>(false);

  // System & CLI state
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [resetting, setResetting] = useState<boolean>(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const filteredAudits = audits.filter(a => {
    const matchesActor = selectedActorType === 'ALL' || a.actorType === selectedActorType;
    const matchesSearch =
      a.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.releaseId && a.releaseId.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesActor && matchesSearch;
  });

  const handleExportAudit = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(audits, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `releasesentry-audit-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleInvestigateIncident = async () => {
    if (!selectedIncident) return;
    setInvestigating(true);
    try {
      await api.investigateIncident(selectedIncident.id);
      onRefresh();
    } catch (err: any) {
      alert(`Investigation error: ${err.message}`);
    } finally {
      setInvestigating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleResetSandbox = async () => {
    if (!confirm('Reset all releases, approvals, and logs back to initial seeded demo state?')) return;
    setResetting(true);
    try {
      const res = await api.resetDemo();
      setResetMsg(res.message);
      onRefresh();
      setTimeout(() => setResetMsg(null), 4000);
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  const agentia = stats?.agentiaStatus;

  return (
    <div className="space-y-6">
      {/* Header with Sub-Tabs */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Traceability & Diagnostics</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-mono">Ledger, Incidents & CLI</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            Audit Trail & Failure Intelligence
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600">
            <button
              onClick={() => setSubTab('AUDIT')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                subTab === 'AUDIT' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Audit Trail
            </button>
            <button
              onClick={() => setSubTab('INCIDENTS')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                subTab === 'INCIDENTS' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Incidents ({incidents.length})
            </button>
            <button
              onClick={() => setSubTab('SYSTEM')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                subTab === 'SYSTEM' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Agentia & CLI
            </button>
          </div>

          <button onClick={onRefresh} className="p-2 text-slate-500 hover:text-slate-900 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {resetMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
          {resetMsg}
        </div>
      )}

      {subTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search action, actor, or release ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600">
                {['ALL', 'AGENT', 'HUMAN', 'SYSTEM', 'CLI', 'MCP'].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedActorType(type)}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      selectedActorType === type ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExportAudit}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-8"></th>
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Actor</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Release</th>
                    <th className="py-2.5 px-4 text-right">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredAudits.map(item => {
                    const isExpanded = expandedAuditId === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          onClick={() => setExpandedAuditId(isExpanded ? null : item.id)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-4 text-slate-400">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap tabular-nums">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {item.action}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 font-sans">{item.actor}</td>
                          <td className="py-2.5 px-4">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {item.actorType}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-blue-600 whitespace-nowrap">
                            {item.releaseId || '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <span className={`font-bold text-[11px] ${
                              item.verdict === 'BLOCK'
                                ? 'text-red-600'
                                : item.verdict === 'WARNING'
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                            }`}>
                              {item.verdict || 'OK'}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50">
                            <td colSpan={7} className="p-4 pl-12">
                              <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap">
                                {JSON.stringify(item.details, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'INCIDENTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
            {incidents.map(inc => (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedIncident?.id === inc.id ? 'bg-red-50/70 border-l-4 border-l-red-600' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono font-bold text-xs text-slate-900">{inc.id}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700">{inc.severity}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">{inc.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{inc.errorMessage}</p>
              </div>
            ))}
          </div>

          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            {selectedIncident ? (
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                  <div>
                    <span className="font-mono text-slate-500">Release: {selectedIncident.releaseId}</span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">{selectedIncident.title}</h3>
                  </div>
                  <button
                    onClick={handleInvestigateIncident}
                    disabled={investigating}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                  >
                    {investigating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Investigate</span>
                  </button>
                </div>

                <div className="p-3 bg-red-50 border border-red-200 rounded font-mono text-red-950">
                  {selectedIncident.errorMessage}
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800">Confirmed Evidence:</span>
                  <ul className="list-disc list-inside text-slate-600 text-[11px]">
                    {selectedIncident.confirmedEvidence.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-emerald-50 rounded border border-emerald-200 space-y-1">
                  <span className="font-bold text-emerald-950">Remediation Steps:</span>
                  <ol className="list-decimal list-inside text-emerald-900 text-[11px]">
                    {selectedIncident.remediationSteps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-400">Select an incident to view diagnostics.</div>
            )}
          </div>
        </div>
      )}

      {subTab === 'SYSTEM' && (
        <div className="space-y-6">
          {/* Adapter Status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Copado Agentia Adapter</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                MODE: {agentia?.mode ?? 'DEMO'}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{agentia?.notice}</p>
            <div className="grid grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Version</span>
                <span className="font-semibold text-slate-900 mt-0.5 block font-mono">{agentia?.version || 'v1.4.0'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Status</span>
                <span className="font-semibold text-emerald-600 mt-0.5 block">Authenticated</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Target Org</span>
                <span className="font-semibold text-slate-900 mt-0.5 block truncate font-mono">{agentia?.activeOrg || 'demo-org'}</span>
              </div>
            </div>
          </div>

          {/* CLI Commands */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">Headless CLI Commands</h3>
              </div>
              <button
                onClick={handleResetSandbox}
                disabled={resetting}
                className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Sandbox</span>
              </button>
            </div>

            <div className="space-y-2">
              {[
                { id: 'c1', cmd: 'npm run releasesentry -- doctor', desc: 'System health check & adapter diagnostics' },
                { id: 'c2', cmd: 'npm run releasesentry -- skills list', desc: 'List all registered Agent Skills' },
                { id: 'c3', cmd: 'npm run releasesentry -- inspect RLS-104', desc: 'Inspect release evidence manifest' },
                { id: 'c4', cmd: 'npm run releasesentry -- risk analyze RLS-104', desc: 'Run explainable 0–100 risk scoring' },
                { id: 'c5', cmd: 'npm run releasesentry -- policy check RLS-104', desc: 'Check governance policy blocks' },
                { id: 'c6', cmd: 'npm run releasesentry -- release execute RLS-104', desc: 'Safely execute approved release' }
              ].map(item => (
                <div key={item.id} className="p-2.5 bg-slate-900 text-slate-200 rounded-lg flex items-center justify-between text-xs font-mono">
                  <div className="truncate mr-3">
                    <span className="text-blue-400">$ </span>
                    <span>{item.cmd}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.cmd, item.id)}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    {copiedCmd === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
