import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, ShieldAlert, Bot, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api.ts';
import { Release, Incident } from '../types.ts';

interface AIAnalystDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  releases: Release[];
  incidents: Incident[];
  selectedReleaseId?: string;
}

export const AIAnalystDrawer: React.FC<AIAnalystDrawerProps> = ({
  isOpen,
  onClose,
  releases,
  incidents,
  selectedReleaseId
}) => {
  const [releaseId, setReleaseId] = useState<string>(selectedReleaseId || releases[0]?.id || 'RLS-104');
  const [queryType, setQueryType] = useState<'RISK_SUMMARY' | 'POLICY_EXPLANATION' | 'REMEDIATION_GUIDANCE' | 'INCIDENT_POSTMORTEM'>('RISK_SUMMARY');
  const [incidentId, setIncidentId] = useState<string>(incidents[0]?.id || 'INC-901');
  const [customQuery, setCustomQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<{ explanation: string; provider: string } | null>(null);

  // Update releaseId when releases change or selectedReleaseId changes
  useEffect(() => {
    if (selectedReleaseId) {
      setReleaseId(selectedReleaseId);
    } else if (releases.length > 0) {
      setReleaseId(releases[0].id);
    }
  }, [selectedReleaseId, releases]);

  if (!isOpen) return null;

  const handleAsk = async () => {
    setLoading(true);
    try {
      const res = await api.askAI({
        type: queryType,
        releaseId: queryType === 'INCIDENT_POSTMORTEM' ? undefined : releaseId,
        incidentId: queryType === 'INCIDENT_POSTMORTEM' ? incidentId : undefined,
        userQuery: customQuery || undefined
      });
      setResponse(res);
    } catch (err: any) {
      setResponse({
        explanation: `Error querying AI Analyst: ${err.message}`,
        provider: 'DETERMINISTIC_ENGINE'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">AI Release Governance Analyst</h2>
              <p className="text-[11px] text-slate-500">Evidence-grounded explanation engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Query Controls */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Analysis Focus</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { type: 'RISK_SUMMARY', label: 'Explain Risk Drivers' },
                { type: 'POLICY_EXPLANATION', label: 'Explain Policy Blockers' },
                { type: 'REMEDIATION_GUIDANCE', label: 'Remediation Steps' },
                { type: 'INCIDENT_POSTMORTEM', label: 'Incident Post-Mortem' }
              ].map(opt => (
                <button
                  key={opt.type}
                  onClick={() => setQueryType(opt.type as any)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md text-left transition-colors truncate ${
                    queryType === opt.type
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {queryType !== 'INCIDENT_POSTMORTEM' ? (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Target Release</label>
              <select
                value={releaseId}
                onChange={e => setReleaseId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-800 focus:outline-blue-600"
              >
                {releases.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.id}: {r.title} ({r.targetEnvironment})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Select Incident</label>
              <select
                value={incidentId}
                onChange={e => setIncidentId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-800 focus:outline-blue-600"
              >
                {incidents.map(inc => (
                  <option key={inc.id} value={inc.id}>
                    {inc.id}: {inc.title} ({inc.severity})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Custom Prompt / Question (Optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Why is RLS-104 blocked from production?"
                value={customQuery}
                onChange={e => setCustomQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                className="flex-1 text-xs border border-slate-200 rounded-md p-2 text-slate-800 focus:outline-blue-600"
              />
              <button
                onClick={handleAsk}
                disabled={loading}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Analyzing...' : 'Ask'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Viewport */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
              <Bot className="w-8 h-8 animate-bounce text-violet-500" />
              <span>Analyzing release evidence & policy constraints...</span>
            </div>
          ) : response ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Analysis Result</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                  Engine: {response.provider}
                </span>
              </div>
              <div className="prose prose-xs max-w-none text-slate-800 font-sans">
                <ReactMarkdown>{response.explanation}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
              <p>Select a question above or enter a query to receive evidence-grounded release governance advice.</p>
              <div className="pt-2">
                <button
                  onClick={handleAsk}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                >
                  Analyze Selected Release Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Guardrail Notice */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Governance Invariant: AI Analyst explanations never override policy gates or self-approve releases.</span>
        </div>
      </div>
    </div>
  );
};
