import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Save,
  Download,
  Plus,
  RefreshCw,
  Clock
} from 'lucide-react';
import { PolicyConfig, Release, PolicyEvaluation, Approval } from '../../types.ts';
import { api } from '../../api.ts';

interface GovernanceViewProps {
  policies: PolicyConfig | null;
  releases: Release[];
  approvals: Approval[];
  onRefresh: () => void;
}

export const GovernanceView: React.FC<GovernanceViewProps> = ({
  policies: initialPolicies,
  releases,
  approvals,
  onRefresh
}) => {
  const [subTab, setSubTab] = useState<'POLICIES' | 'APPROVALS'>('POLICIES');

  // Policy State
  const [config, setConfig] = useState<PolicyConfig>(initialPolicies || {
    productionRequiresApproval: true,
    blockOnFailedTests: true,
    blockOnCriticalRisk: true,
    blockOnMissingRequiredEvidence: true,
    requireEnvironmentMatch: true,
    requireValidApproval: true,
    requireConfirmationForDestructiveActions: true,
    maxAcceptableRiskScore: 70,
    minCodeCoveragePercent: 75
  });
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>(releases[0]?.id || 'RLS-104');
  const [savingPolicies, setSavingPolicies] = useState<boolean>(false);
  const [policySaved, setPolicySaved] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<PolicyEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  // Approval State
  const [approverName, setApproverName] = useState<string>('Sarah Connor');
  const [approverRole, setApproverRole] = useState<string>('VP of Engineering');
  const [approvalNotes, setApprovalNotes] = useState<string>('Verified Staging regression suite. Approved for Production deployment.');
  const [submittingApproval, setSubmittingApproval] = useState<boolean>(false);
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);

  const handleTogglePolicy = (key: keyof PolicyConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePolicies = async () => {
    setSavingPolicies(true);
    setPolicySaved(false);
    try {
      await api.updatePolicies(config);
      setPolicySaved(true);
      setTimeout(() => setPolicySaved(false), 3000);
      onRefresh();
    } catch (err: any) {
      alert(`Error saving policies: ${err.message}`);
    } finally {
      setSavingPolicies(false);
    }
  };

  const handleSimulatePolicy = async () => {
    setEvaluating(true);
    try {
      const res = await api.validatePolicy(selectedReleaseId, config as any);
      setEvaluation(res.output);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const handleGrantApproval = async (releaseId: string, approvalId?: string) => {
    setSubmittingApproval(true);
    try {
      await api.decideApproval(releaseId, approverName, 'APPROVE', approvalNotes, approvalId);
      onRefresh();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleRejectApproval = async (releaseId: string, approvalId?: string) => {
    setSubmittingApproval(true);
    try {
      await api.decideApproval(releaseId, approverName, 'REJECT', 'Rejected: Governance requirements unmet.', approvalId);
      onRefresh();
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleCreateApprovalRequest = async () => {
    setSubmittingApproval(true);
    try {
      await api.requestApproval(selectedReleaseId, approverName, approvalNotes);
      setShowRequestModal(false);
      onRefresh();
    } catch (err: any) {
      alert(`Request error: ${err.message}`);
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleExportPolicies = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'releasesentry-policies.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header with Sub-Navigation */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Governance & Authorization</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-mono">Policy-as-Code & Sign-Offs</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            Release Governance Control Center
          </h2>
        </div>

        {/* Sub-Tabs: Policies vs Human Approvals */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600">
            <button
              onClick={() => setSubTab('POLICIES')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                subTab === 'POLICIES' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Policy-as-Code
            </button>
            <button
              onClick={() => setSubTab('APPROVALS')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                subTab === 'APPROVALS' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <span>Human Approvals</span>
              {approvals.filter(a => a.status === 'PENDING').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              )}
            </button>
          </div>

          <button onClick={onRefresh} className="p-2 text-slate-500 hover:text-slate-900 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {subTab === 'POLICIES' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Policy Rules (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Enforced Guardrails</h3>
                <p className="text-xs text-slate-500">Evaluated by release-policy-validation skill</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPolicies}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-md"
                >
                  Export JSON
                </button>
                <button
                  onClick={handleSavePolicies}
                  disabled={savingPolicies}
                  className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs"
                >
                  {policySaved ? 'Saved!' : 'Save Rules'}
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  key: 'productionRequiresApproval' as const,
                  title: 'Production Requires Authorized Human Approval',
                  desc: 'Deployments to PROD org unconditionally block unless an active, unexpired human signature exists matching the current plan hash.',
                  severity: 'BLOCK'
                },
                {
                  key: 'blockOnFailedTests' as const,
                  title: 'Block on Failed or Missing Automated Tests',
                  desc: 'Releases with zero test executions or any failing unit test assertions are halted at pre-flight gates.',
                  severity: 'BLOCK'
                },
                {
                  key: 'blockOnCriticalRisk' as const,
                  title: 'Block on Critical Risk Score',
                  desc: 'Releases with an explainable risk score greater than threshold or CRITICAL tier cannot proceed.',
                  severity: 'BLOCK'
                },
                {
                  key: 'blockOnMissingRequiredEvidence' as const,
                  title: 'Block on Missing Required Evidence Records',
                  desc: 'Releases lacking mandatory security sign-off, staging verification, or architecture review cannot deploy.',
                  severity: 'BLOCK'
                },
                {
                  key: 'requireEnvironmentMatch' as const,
                  title: 'Enforce Sequential Promotion Hierarchy',
                  desc: 'DEV cannot directly promote into PROD. Releases must be certified sequentially through QA and STAGING.',
                  severity: 'BLOCK'
                },
                {
                  key: 'requireConfirmationForDestructiveActions' as const,
                  title: 'Dual Confirmation for Destructive Components',
                  desc: 'Requires explicit sign-off when release manifest contains DELETE actions or schema removals.',
                  severity: 'WARNING'
                }
              ].map(rule => (
                <div
                  key={rule.key}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        rule.severity === 'BLOCK' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {rule.severity}
                      </span>
                      <h4 className="font-bold text-slate-900">{rule.title}</h4>
                    </div>
                    <p className="text-slate-600 mt-1 leading-relaxed">{rule.desc}</p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={Boolean(config[rule.key])}
                      onChange={() => handleTogglePolicy(rule.key)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Max Acceptable Risk Score</label>
                <input
                  type="number"
                  min="10"
                  max="90"
                  value={config.maxAcceptableRiskScore}
                  onChange={e => setConfig(prev => ({ ...prev, maxAcceptableRiskScore: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Min Code Coverage (%)</label>
                <input
                  type="number"
                  min="50"
                  max="95"
                  value={config.minCodeCoveragePercent}
                  onChange={e => setConfig(prev => ({ ...prev, minCodeCoveragePercent: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Right: Policy Evaluation Simulator (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Policy Simulator</h3>
              <span className="text-xs font-mono text-slate-500">Test Any Release</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Select Release to Test</label>
              <div className="flex gap-2">
                <select
                  value={selectedReleaseId}
                  onChange={e => setSelectedReleaseId(e.target.value)}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-md p-2 font-medium"
                >
                  {releases.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.id}: {r.title} ({r.targetEnvironment})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSimulatePolicy}
                  disabled={evaluating}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shrink-0"
                >
                  {evaluating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Evaluate'}
                </button>
              </div>
            </div>

            {evaluation ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700">Simulated Verdict:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                    evaluation.isBlocked
                      ? 'bg-red-50 text-red-700'
                      : evaluation.overallVerdict === 'WARNING'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {evaluation.overallVerdict} (Blocked: {evaluation.isBlocked ? 'YES' : 'NO'})
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {evaluation.evaluations.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate">{item.ruleName}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          item.verdict === 'BLOCK'
                            ? 'bg-red-100 text-red-700'
                            : item.verdict === 'WARNING'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {item.verdict}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-1">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-400">
                Select a release and click "Evaluate" to run the active policy engine.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Approvals Sub-Tab */
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Human Authorization Queue ({approvals.length})
                </h3>
                <p className="text-xs text-slate-500">Cryptographically bound to release plan hash</p>
              </div>
              <button
                onClick={() => setShowRequestModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Request Sign-Off</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Release ID</th>
                    <th className="py-2.5 px-4">Approver</th>
                    <th className="py-2.5 px-4">Plan Hash</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Notes</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {approvals.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {app.releaseId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{app.approverName}</div>
                        <div className="text-[11px] text-slate-500">{app.approverRole}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {app.releasePlanHash.substring(0, 10)}...
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`font-semibold text-[11px] px-2 py-0.5 rounded ${
                          app.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : app.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs text-slate-700 truncate">
                        {app.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {app.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleGrantApproval(app.releaseId, app.id)}
                              disabled={submittingApproval}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectApproval(app.releaseId, app.id)}
                              disabled={submittingApproval}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Decided</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* New Approval Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Request Release Approval</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Release</label>
                <select
                  value={selectedReleaseId}
                  onChange={e => setSelectedReleaseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md p-2"
                >
                  {releases.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.id}: {r.title} ({r.targetEnvironment})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Approver Name</label>
                <input
                  type="text"
                  value={approverName}
                  onChange={e => setApproverName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md p-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Approver Role</label>
                <input
                  type="text"
                  value={approverRole}
                  onChange={e => setApproverRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md p-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Review Notes</label>
                <textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={e => setApprovalNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateApprovalRequest}
                disabled={submittingApproval}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
