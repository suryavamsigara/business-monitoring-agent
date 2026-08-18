import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { agentApi } from "../api/agentApi";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingState } from "../components/LoadingState";
import { formatDateTime, formatTime } from "../utils/formatters";
import { 
  ArrowLeft, 
  Terminal, 
  Activity, 
  Search, 
  Brain, 
  Sliders, 
  Bell, 
  Clock, 
  Code, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Bot
} from "lucide-react";
import { cn } from "../utils/cn";

const STEP_CONFIG = {
  Observe: {
    icon: Activity,
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    description: "Ingests raw business telemetry from daily sales, inventory, and competitor benchmarks.",
  },
  Detect: {
    icon: Search,
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    description: "Runs deterministic models (z-scores, thresholds, relative WoW, compound patterns) across monitored KPIs.",
  },
  Investigate: {
    icon: Search,
    color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    description: "Executes targeted agent tools to pull multi-signal telemetry (SKU-level breakdowns, catalog risks).",
  },
  Reason: {
    icon: Brain,
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    description: "Synthesizes multi-factor evidence into likely contributor hypotheses without claiming false causality.",
  },
  Prioritize: {
    icon: Sliders,
    color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
    description: "Calculates transparent severity score (0-100) using deviation magnitude, impact exposure, and confidence.",
  },
  Alert: {
    icon: Bell,
    color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    description: "Generates or updates business alerts, enforcing deduplication and cooldown rules.",
  },
};

export function AgentRunDetail({ onOpenAssistantWithContext }) {
  const { runId } = useParams();
  const [run, setRun] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState({});

  const fetchRunDetail = async () => {
    setIsLoading(true);
    try {
      const data = await agentApi.getRunDetail(runId);
      setRun(data);
      // Expand all steps by default
      if (data?.steps) {
        const initialExpanded = {};
        data.steps.forEach((s) => {
          initialExpanded[s.id] = true;
        });
        setExpandedSteps(initialExpanded);
      }
    } catch (err) {
      console.error("Failed to load run detail:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRunDetail();
  }, [runId]);

  const toggleStep = (stepId) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  if (isLoading) {
    return <LoadingState message="Loading agent execution steps and tool audit trace..." />;
  }

  if (!run) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Agent Run Not Found</h3>
        <p className="text-xs text-slate-400">The requested run ID #{runId} could not be found.</p>
        <Link
          to="/runs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Runs
        </Link>
      </div>
    );
  }

  const {
    id,
    started_at,
    completed_at,
    status,
    trigger,
    kpis_checked,
    anomalies_detected,
    alerts_created,
    error_message,
    steps = [],
  } = run;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/runs"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-amber-400 font-bold uppercase">
                Execution Audit Trail
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] font-mono text-slate-400">Trigger: {trigger}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
              Agent Run #{id}
            </h1>
          </div>
        </div>

        <button
          onClick={() =>
            onOpenAssistantWithContext &&
            onOpenAssistantWithContext({
              runId: id,
              alertTitle: `Agent Run #${id}`,
            })
          }
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 hover:border-amber-500/60 text-amber-300 text-xs font-semibold transition-all shadow-sm self-start sm:self-auto"
        >
          <Bot className="w-4 h-4 text-amber-400" />
          <span>Ask Agent About Run #{id}</span>
        </button>
      </div>

      {/* Summary Stat Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <StatusBadge status={status} size="md" />
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Started: {formatDateTime(started_at)}
              </span>
              {completed_at && (
                <span className="text-xs font-mono text-slate-500">
                  (Finished {formatTime(completed_at)})
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 max-w-xl">
              Deterministic 6-phase autonomous orchestration cycle without external black-box frameworks.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-center">
            <div className="px-3">
              <div className="text-base font-bold font-mono text-white">{kpis_checked}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">KPIs Evaluated</div>
            </div>
            <div className="px-3 border-x border-slate-800">
              <div className="text-base font-bold font-mono text-rose-400">{anomalies_detected}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Anomalies</div>
            </div>
            <div className="px-3">
              <div className="text-base font-bold font-mono text-amber-300">{alerts_created}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Alerts Formed</div>
            </div>
          </div>
        </div>

        {error_message && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
            <strong>Error:</strong> {error_message}
          </div>
        )}
      </div>

      {/* Step by Step Execution Sequence */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          Autonomous Step Execution Trace ({steps.length} Steps)
        </h3>

        <div className="space-y-3">
          {steps.map((step, idx) => {
            const config = STEP_CONFIG[step.step_name] || {
              icon: Terminal,
              color: "text-slate-300 border-slate-700 bg-slate-800",
              description: "Agent execution step",
            };
            const StepIcon = config.icon;
            const isExpanded = expandedSteps[step.id];

            return (
              <div
                key={step.id}
                className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden transition-all shadow-md"
              >
                {/* Step Header */}
                <div
                  onClick={() => toggleStep(step.id)}
                  className="p-4 bg-slate-950/60 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-950 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center border font-bold text-xs",
                        config.color
                      )}
                    >
                      <StepIcon className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs sm:text-sm">
                          Step {idx + 1}: {step.step_name}
                        </span>
                        <StatusBadge status={step.status} size="xs" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                        {config.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                    {step.duration_ms && (
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-400 font-bold text-[11px]">
                        {step.duration_ms} ms
                      </span>
                    )}
                    <span className="hidden sm:inline">{formatTime(step.started_at)}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Step Content */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900/40 text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Output Summary
                      </div>
                      <p className="text-slate-200 leading-relaxed font-sans bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                        {step.output_summary}
                      </p>
                    </div>

                    {/* Metadata & Tool Call JSON Inspector */}
                    {step.metadata && Object.keys(step.metadata).length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                          <Code className="w-3 h-3 text-amber-400" />
                          <span>Structured Telemetry & Tool Calls Payload</span>
                        </div>
                        <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
                          {JSON.stringify(step.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
