/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header.tsx';
import { StandoutWalkthroughModal } from './components/StandoutWalkthroughModal.tsx';
import { AIAnalystDrawer } from './components/AIAnalystDrawer.tsx';
import { OverviewView } from './components/views/OverviewView.tsx';
import { ReleaseIntelligenceView } from './components/views/ReleaseIntelligenceView.tsx';
import { SkillsCenterView } from './components/views/SkillsCenterView.tsx';
import { GovernanceView } from './components/views/GovernanceView.tsx';
import { AuditDiagnosticsView } from './components/views/AuditDiagnosticsView.tsx';
import { api } from './api.ts';
import {
  Release,
  SystemStats,
  PolicyConfig,
  Approval,
  Incident,
  AuditEvent,
  AgentSkill,
  SkillExecution
} from './types.ts';
import { RefreshCw, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [isAIAnalystOpen, setIsAIAnalystOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>('RLS-104');

  // Core Data State
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [policies, setPolicies] = useState<PolicyConfig | null>(null);
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [skillHistory, setSkillHistory] = useState<SkillExecution[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [audits, setAudits] = useState<AuditEvent[]>([]);

  const loadAllData = async () => {
    try {
      const [sData, rData, pData, skData, skhData, appData, incData, audData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getReleases().catch(() => []),
        api.getPolicies().catch(() => null),
        api.getSkills().catch(() => []),
        api.getSkillHistory().catch(() => []),
        api.getApprovals().catch(() => []),
        api.getIncidents().catch(() => []),
        api.getAudits().catch(() => [])
      ]);

      setStats(sData);
      setReleases(rData);
      setPolicies(pData);
      setSkills(skData);
      setSkillHistory(skhData);
      setApprovals(appData);
      setIncidents(incData);
      setAudits(audData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-[#0F172A] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenStandoutDemo={() => setIsDemoModalOpen(true)}
        onOpenAIAnalyst={() => setIsAIAnalystOpen(true)}
        demoModeNotice={stats?.agentiaStatus?.notice}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-6 md:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Connecting to ReleaseSentry SQLite & Skill Engine...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-900 max-w-xl mx-auto space-y-3">
            <h3 className="font-bold text-sm">Connection Alert</h3>
            <p className="text-xs leading-relaxed">{error}</p>
            <button
              onClick={() => { setLoading(true); loadAllData(); }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewView
                stats={stats}
                releases={releases}
                audits={audits}
                skillHistory={skillHistory}
                onNavigateTab={setActiveTab}
                onOpenStandoutDemo={() => setIsDemoModalOpen(true)}
              />
            )}

            {activeTab === 'releases' && (
              <ReleaseIntelligenceView
                releases={releases}
                onRefresh={loadAllData}
                onOpenStandoutDemo={() => setIsDemoModalOpen(true)}
              />
            )}

            {activeTab === 'skills' && (
              <SkillsCenterView
                skills={skills}
                skillHistory={skillHistory}
                releases={releases}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'governance' && (
              <GovernanceView
                policies={policies}
                releases={releases}
                approvals={approvals}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'audit' && (
              <AuditDiagnosticsView
                audits={audits}
                incidents={incidents}
                stats={stats}
                onRefresh={loadAllData}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">ReleaseSentry AI</span>
            <span>— Headless Release Governance Platform for Copado Agentia</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>6 Reusable Agent Skills</span>
            <span className="text-slate-300">·</span>
            <span>11 Native MCP Tools</span>
            <span className="text-slate-300">·</span>
            <span>Deterministic Policy-as-Code</span>
          </div>
        </div>
      </footer>

      {/* Interactive Standout Demo Modal (RLS-104) */}
      <StandoutWalkthroughModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onRefreshData={loadAllData}
      />

      {/* AI Release Analyst Drawer */}
      <AIAnalystDrawer
        isOpen={isAIAnalystOpen}
        onClose={() => setIsAIAnalystOpen(false)}
        releases={releases}
        incidents={incidents}
        selectedReleaseId={selectedReleaseId}
      />
    </div>
  );
}
