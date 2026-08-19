import React, { useState, useEffect, useRef } from "react";
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
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Bot,
  RefreshCw,
  Zap
} from "lucide-react";
import { cn } from "../utils/cn";

const STEP_CONFIG = {
  Observe: {
    icon: Activity,
    color: "text-blue-700 border-blue-200 bg-blue-50",
    description: "Ingests raw business telemetry from daily sales, inventory, and channel metrics.",
  },
  Detect: {
    icon: Search,
    color: "text-amber-800 border-amber-200 bg-amber-50",
    description: "Runs deterministic anomaly models and rolling baselines across monitored KPIs.",
  },
  Investigate: {
    icon: Search,
    color: "text-purple-700 border-purple-200 bg-purple-50",
    description: "Executes targeted investigation tools to isolate SKU, channel, and pricing signals.",
  },
  Reason: {
    icon: Brain,
    color: "text-slate-800 border-slate-200 bg-slate-100",
    description: "Synthesizes multi-factor evidence into likely contributor hypotheses.",
  },
  Prioritize: {
    icon: Sliders,
    color: "text-orange-700 border-orange-200 bg-orange-50",
    description: "Calculates transparent severity score (0-100) using deviation magnitude, impact exposure, and confidence.",
  },
  Alert: {
    icon: Bell,
    color: "text-rose-700 border-rose-200 bg-rose-50",
    description: "Generates or updates business alerts, enforcing deduplication and cooldown rules.",
  },
};

export function AgentRunDetail({ onOpenAssistantWithContext }) {
  const { runId } = useParams();
  const [run, setRun] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState({});
  const lastStepCountRef = useRef(0);

  const fetchRunDetail = async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const data = await agentApi.getRunDetail(runId);
      if (data) {
        setRun(data);
        if (data.steps && data.steps.length > 0) {
          setExpandedSteps((prev) => {
            const next = { ...prev };
            data.steps.forEach((s) => {
              if (next[s.id] === undefined) {
                next[s.id] = true; // Auto-expand newly arrived steps
              }
            });
            return next;
          });
          lastStepCountRef.current = data.steps.length;
        }
      }
    } catch (err) {
      console.error("Failed to load run detail:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRunDetail(false);
  }, [runId]);

  // Live real-time polling while run is active or in progress
  useEffect(() => {
    const isRunActive = !run || run.status === "Running" || run.status === "In Progress" || !run.completed_at;
    
    // Poll every 1.5s if active, or every 6s as a lighter heartbeat
    const intervalTime = isRunActive ? 1500 : 8000;
    
    const pollInterval = setInterval(() => {
      fetchRunDetail(true);
    }, intervalTime);

    return () => clearInterval(pollInterval);
  }, [runId, run?.status, run?.completed_at]);

  const toggleStep = (stepId) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  if (isLoading && !run) {
    return (
      <LoadingState 
        title="Agent Step Execution Trace"
        messages={[
          "Connecting to execution audit logger...",
          "Streaming real-time tool payloads & step telemetry...",
          "Synthesizing live workflow trace...",
        ]}
      />
    );
  }

  if (!run) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Agent Run Not Found</h3>
        <p className="text-xs text-slate-500">The requested run ID #{runId} could not be found.</p>
        <Link
          to="/runs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
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

  const isLive = status === "Running" || status === "In Progress" || !completed_at;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/runs"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 font-bold uppercase">
                Execution Audit Trail
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-mono text-slate-700">Trigger: {trigger}</span>
              {isLive && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  LIVE STREAMING
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Agent Run #{id}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => fetchRunDetail(true)}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh steps"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-slate-700", isRefreshing ? "animate-spin" : "")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() =>
              onOpenAssistantWithContext &&
              onOpenAssistantWithContext({
                runId: id,
                alertTitle: `Agent Run #${id}`,
              })
            }
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-all shadow-sm"
          >
            <Bot className="w-4 h-4 text-slate-700" />
            <span>Ask Agent About Run #{id}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Banner */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={status} size="sm" />
              <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Started: {formatDateTime(started_at)}
              </span>
              {completed_at ? (
                <span className="text-xs font-mono text-slate-500">
                  (Finished {formatTime(completed_at)})
                </span>
              ) : isLive ? (
                <span className="text-xs font-mono text-emerald-600 font-semibold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 animate-pulse" />
                  Active Execution in Progress...
                </span>
              ) : null}
            </div>

            <p className="text-xs text-slate-600 max-w-xl font-sans">
              Autonomous 6-stage telemetry and investigation workflow: Observe → Detect → Investigate → Reason → Prioritize → Alert.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
            <div className="px-3">
              <div className="text-base font-bold font-mono text-slate-900">{kpis_checked}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">KPIs Evaluated</div>
            </div>
            <div className="px-3 border-x border-slate-200">
              <div className="text-base font-bold font-mono text-rose-700">{anomalies_detected}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Anomalies</div>
            </div>
            <div className="px-3">
              <div className="text-base font-bold font-mono text-slate-900">{alerts_created}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Alerts Formed</div>
            </div>
          </div>
        </div>

        {error_message && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
            <strong>Error:</strong> {error_message}
          </div>
        )}
      </div>

      {/* Step by Step Execution Sequence */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-700" />
            Step Execution Trace ({steps.length} Steps Recorded)
          </h3>
          {isLive && (
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live streaming updates...
            </span>
          )}
        </div>

        {steps.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
            <h4 className="text-xs font-semibold text-slate-800">Initializing Step Execution...</h4>
            <p className="text-[11px] text-slate-500">Agent is dispatching telemetry collectors. Steps will appear live as they complete.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, idx) => {
              const config = STEP_CONFIG[step.step_name] || {
                icon: Terminal,
                color: "text-slate-700 border-slate-200 bg-slate-100",
                description: "Agent execution step",
              };
              const StepIcon = config.icon;
              const isExpanded = expandedSteps[step.id];

              return (
                <div
                  key={step.id}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all shadow-sm"
                >
                  {/* Step Header */}
                  <div
                    onClick={() => toggleStep(step.id)}
                    className="p-4 bg-slate-50 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center border font-bold text-xs shadow-xs",
                          config.color
                        )}
                      >
                        <StepIcon className="w-4 h-4" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                            Step {idx + 1}: {step.step_name}
                          </span>
                          <StatusBadge status={step.status} size="xs" />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
                          {config.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                      {step.duration_ms !== undefined && step.duration_ms !== null && (
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-900 font-bold text-[11px] shadow-xs">
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
                    <div className="p-4 border-t border-slate-100 space-y-3 bg-white text-xs">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                          Output Summary
                        </div>
                        <p className="text-slate-800 leading-relaxed font-sans bg-slate-50 p-3 rounded-lg border border-slate-200">
                          {step.output_summary}
                        </p>
                      </div>

                      {/* Metadata & Tool Call JSON Inspector */}
                      {step.metadata && Object.keys(step.metadata).length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                            <Code className="w-3 h-3 text-slate-700" />
                            <span>Structured Telemetry & Tool Calls Payload</span>
                          </div>
                          <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-100 overflow-x-auto">
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
        )}
      </div>
    </div>
  );
}
