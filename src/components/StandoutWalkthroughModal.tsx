import React, { useState } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FileText,
  Lock,
  Zap,
  Terminal,
  Activity
} from 'lucide-react';
import { api } from '../api.ts';
import { Release } from '../types.ts';

interface StandoutWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
}

export const StandoutWalkthroughModal: React.FC<StandoutWalkthroughModalProps> = ({
  isOpen,
  onClose,
  onRefreshData
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [inspectionResult, setInspectionResult] = useState<any>(null);
  const [riskResult, setRiskResult] = useState<any>(null);
  const [policyResult, setPolicyResult] = useState<any>(null);
  const [remediationResult, setRemediationResult] = useState<any>(null);
  const [approvalResult, setApprovalResult] = useState<any>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);

  if (!isOpen) return null;

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Step 1: Run Inspection
  const handleRunInspection = async () => {
    setLoading(true);
    addLog('Executing Agent Skill: release-inspection on RLS-104...');
    try {
      const res = await api.inspectRelease('RLS-104', true);
      setInspectionResult(res.output);
      addLog(`✓ Inspection complete: Found ${res.output.componentSummary.total} components, ${res.output.missingEvidenceFields.length} missing evidence items.`);
      setCurrentStep(2);
      onRefreshData();
    } catch (err: any) {
      addLog(`❌ Inspection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Run Risk Analysis
  const handleRunRiskAnalysis = async () => {
    setLoading(true);
    addLog('Executing Agent Skill: release-risk-analysis on RLS-104...');
    try {
      const res = await api.analyzeRisk('RLS-104');
      setRiskResult(res.output);
      addLog(`✓ Risk analysis complete: Calculated Score: ${res.output.score}/100 (${res.output.level}) with ${res.output.findings.length} findings.`);
      setCurrentStep(3);
      onRefreshData();
    } catch (err: any) {
      addLog(`❌ Risk analysis error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Run Policy Validation
  const handleRunPolicyValidation = async () => {
    setLoading(true);
    addLog('Executing Agent Skill: release-policy-validation against governance gates...');
    try {
      const res = await api.validatePolicy('RLS-104');
      setPolicyResult(res.output);
      addLog(`✓ Policy validation complete: Overall Verdict: ${res.output.overallVerdict} (Blocked: ${res.output.isBlocked ? 'YES' : 'NO'}).`);
      setCurrentStep(4);
      onRefreshData();
    } catch (err: any) {
      addLog(`❌ Policy error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Run Remediation Skill
  const handleRunRemediation = async () => {
    setLoading(true);
    addLog('Executing Agent Skill: release-remediation to generate actionable unblocking plan...');
    try {
      const res = await api.getRemediation('RLS-104');
      setRemediationResult(res.output);
      addLog(`✓ Remediation complete: Generated ${res.output.blockerCount} prioritized tasks to resolve release blocks.`);
      setCurrentStep(5);
      onRefreshData();
    } catch (err: any) {
      addLog(`❌ Remediation error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Supply Missing Evidence
  const handleSupplyEvidence = async () => {
    setLoading(true);
    addLog('Submitting verified test report (94% coverage, 52 tests passed) & Staging promotion attestation...');
    try {
      await api.updateEvidence('RLS-104', {
        sourceEnvironment: 'STAGING', // Promote through Staging
        tests: {
          hasRun: true,
          passed: true,
          totalTests: 52,
          failedTests: 0,
          codeCoveragePercent: 94,
          testReportUrl: 'https://copado.internal/reports/test-rls104-remediated.json',
          executionTimestamp: new Date().toISOString()
        },
        dependencies: {
          unresolvedCount: 0,
          circularCount: 0,
          missingPackages: [],
          externalServicesVerified: true
        },
        security: {
          criticalVulnerabilities: 0,
          highVulnerabilities: 0,
          secretLeaksDetected: false,
          compliancePassed: true
        },
        environmentValidated: true,
        missingEvidenceFields: []
      });
      addLog('✓ Release evidence updated with real-time test artifacts and environment certification.');
      setCurrentStep(6);
      onRefreshData();
    } catch (err: any) {
      addLog(`❌ Evidence update error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 6: Re-inspect, Re-analyze, Re-validate
  const handleRevalidation = async () => {
    setLoading(true);
    addLog('Re-running autonomous governance pipeline (Inspection -> Risk -> Policy)...');
    try {
      const report = await api.runAllSkillsWorkflow('RLS-104');
      setInspectionResult(report.inspection);
      setRiskResult(report.risk);
      setPolicyResult(report.policy);
      addLog(`✓ Re-inspection & analysis complete! Risk score dropped to ${report.risk.score}/100 (${report.risk.level}).`);
      addLog(`✓ Policy verdict: ${report.policy.overallVerdict}. Remaining requirement: Human Authorization.`);
      setCurrentStep(7);
      onRefreshData();
    } catch (err: any) {
      addLog(`❌ Re-validation error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 7: Request & Grant Human Approval
  const handleGrantApproval = async () => {
    setLoading(true);
    addLog('Requesting human approval from VP Engineering with verified SHA-256 plan hash...');
    try {
      const res = await api.decideApproval(
        'RLS-104',
        'Sarah Connor',
        'APPROVE',
        'All 52 regression unit tests passing with 94% coverage. Staging certification confirmed. Approved for PROD cutover.'
      );
      setApprovalResult(res);
      addLog(`✓ Human approval granted by ${res.approverName} (${res.approverRole}). Valid for 24h.`);
      setCurrentStep(8);
      onRefreshData();
    } catch (err: any) {
      addLog(`❌ Approval error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 8: Safe Execution through Adapter
  const handleSafeExecution = async () => {
    setLoading(true);
    addLog('Initiating Safe Release Execution skill with pre-flight gate checks...');
    try {
      const res = await api.executeRelease('RLS-104', 'Copado Release Operator (Sarah Connor Authorization)', true);
      setExecutionResult(res.output);
      addLog(`✓ Safe execution SUCCESS! Execution ID: ${res.output.executionId} in ${res.output.durationMs}ms.`);
      setCurrentStep(9);
      onRefreshData();
    } catch (err: any) {
      addLog(`❌ Execution blocked: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                End-to-End Governance Walkthrough
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-mono font-medium text-slate-500">RLS-104 PROD Cutover</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Autonomous Agent Skills Orchestration Lifecycle
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs overflow-x-auto gap-2">
          {[
            { num: 1, label: 'Inspect' },
            { num: 2, label: 'Risk' },
            { num: 3, label: 'Policy Block' },
            { num: 4, label: 'Remediate' },
            { num: 5, label: 'Fix Evidence' },
            { num: 6, label: 'Re-Certify' },
            { num: 7, label: 'Human Signoff' },
            { num: 8, label: 'Execute' }
          ].map(s => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 whitespace-nowrap ${
                currentStep === s.num
                  ? 'text-blue-600 font-bold'
                  : currentStep > s.num
                    ? 'text-emerald-600 font-medium'
                    : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep === s.num
                    ? 'bg-blue-600 text-white'
                    : currentStep > s.num
                      ? 'bg-emerald-100 text-emerald-700 font-bold'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {currentStep > s.num ? '✓' : s.num}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Active Step Card */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Step 1: Release Inspection</h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">
                      The <span className="font-mono text-slate-800">release-inspection</span> skill reads RLS-104 metadata, detects DEV to PROD promotion, tallies 5 components, and scans for test and security evidence.
                    </p>
                  </div>
                  <button
                    onClick={handleRunInspection}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Run Inspection Skill</span>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Step 2: Release Risk Analysis</h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">
                      The <span className="font-mono text-slate-800">release-risk-analysis</span> skill evaluates evidence from Step 1 and calculates a deterministic score from 0–100, attributing exact mathematical risk penalties.
                    </p>
                  </div>
                  <button
                    onClick={handleRunRiskAnalysis}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Run Risk Analysis Skill</span>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Step 3: Release Policy Validation (The Gate)</h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">
                      The <span className="font-mono text-slate-800">release-policy-validation</span> skill checks organizational guardrails. Because RLS-104 lacks tests, lacks approval, and skips tiers, the gate must return <span className="text-red-600 font-bold">BLOCK</span>.
                    </p>
                  </div>
                  <button
                    onClick={handleRunPolicyValidation}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    <span>Evaluate Governance Gates</span>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Step 4: Release Remediation Skill</h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">
                      Releases are not dead ends. The <span className="font-mono text-slate-800">release-remediation</span> skill analyzes every blocker and maps it to concrete developer commands and evidence re-scans.
                    </p>
                  </div>
                  <button
                    onClick={handleRunRemediation}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>Generate Remediation Plan</span>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Step 5: Supply Remediated Evidence</h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">
                      Simulate the developer executing the remediation plan: Automated Apex unit test suite passes with <span className="font-bold text-emerald-700">94% code coverage (52 tests)</span>, package dependency is certified, and staging promotion is verified.
                    </p>
                  </div>
                  <button
                    onClick={handleSupplyEvidence}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Supply Remediated Evidence</span>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Step 6: Re-Inspection & Re-Validation</h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">
                      Now re-execute the autonomous skills chain. Watch the risk score plummet from CRITICAL to LOW, clearing all automated blockers!
                    </p>
                  </div>
                  <button
                    onClick={handleRevalidation}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Re-Run Skills Chain</span>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 7 && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Step 7: Production Human Sign-Off</h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">
                      Governance invariant: AI agents can never self-approve production releases. Sarah Connor (VP Engineering) grants cryptographic authorization matching current plan hash.
                    </p>
                  </div>
                  <button
                    onClick={handleGrantApproval}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>Grant VP Eng Sign-Off</span>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 8 && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Step 8: Safe Release Execution</h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">
                      The <span className="font-mono text-slate-800">safe-release-execution</span> skill checks hash verification, validates approval identity, re-verifies policy gates, and dispatches deployment through Copado Agentia adapter.
                    </p>
                  </div>
                  <button
                    onClick={handleSafeExecution}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Execute Safe Release</span>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 9 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>RLS-104 Fully Governed, Approved, and Executed Successfully!</span>
                </div>
                <p className="text-xs text-slate-600">
                  The complete governance journey (Inspect → Risk → Block → Remediate → Fix Evidence → Re-verify → Human Signoff → Safe Execution) has completed with immutable audit logging.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    View in Dashboard
                  </button>
                  <button
                    onClick={async () => {
                      await api.resetDemo();
                      setCurrentStep(1);
                      setLogs([]);
                      onRefreshData();
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Reset Demo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Evidence State Comparison */}
          {(riskResult || policyResult) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Risk Assessment</span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    (riskResult?.score ?? 88) > 70
                      ? 'bg-red-50 text-red-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    Score: {riskResult?.score ?? 88}/100 ({riskResult?.level ?? 'CRITICAL'})
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  {riskResult?.summary || 'Calculated based on test coverage, promotion hierarchy, and schema modification.'}
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Policy Verdict</span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    policyResult?.isBlocked
                      ? 'bg-red-50 text-red-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {policyResult?.overallVerdict ?? 'BLOCK'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  {policyResult?.blockingReasons?.join('; ') || 'Policies enforce zero test failures, production approval, and evidence completeness.'}
                </p>
              </div>
            </div>
          )}

          {/* Live Orchestration Console Logs */}
          <div className="bg-slate-900 rounded-xl p-4 text-slate-200 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Agent Skills Orchestration Console</span>
              </div>
              <span className="text-[10px] text-slate-500">Real-time SQLite & Adapter Streams</span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {logs.length === 0 ? (
                <span className="text-slate-500">Awaiting workflow execution trigger...</span>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
