import React from 'react';
import { ShieldCheck, Bot, Sparkles, Activity } from 'lucide-react';

export type ActiveTab = 'overview' | 'releases' | 'skills' | 'governance' | 'audit';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenStandoutDemo: () => void;
  onOpenAIAnalyst: () => void;
  demoModeNotice?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenStandoutDemo,
  onOpenAIAnalyst
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            ReleaseSentry AI
          </span>
        </div>

        {/* Zone 2: Navigation Links (5 clean single-line links) */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => onTabChange('overview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onTabChange('releases')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'releases'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Releases
          </button>
          <button
            onClick={() => onTabChange('skills')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'skills'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Agent Skills</span>
          </button>
          <button
            onClick={() => onTabChange('governance')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'governance'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Governance & Approvals
          </button>
          <button
            onClick={() => onTabChange('audit')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Audit & Diagnostics
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenAIAnalyst}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            title="Open AI Release Analyst"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span>AI Analyst</span>
          </button>
          <button
            onClick={onOpenStandoutDemo}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs whitespace-nowrap"
          >
            <span>Run Demo Flow (RLS-104)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
