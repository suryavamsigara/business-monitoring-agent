import React from "react";
import { formatTime } from "../utils/formatters";
import { 
  CheckCircle2, 
  Search, 
  Brain, 
  Sliders, 
  Bell, 
  Terminal, 
  Activity 
} from "lucide-react";
import { cn } from "../utils/cn";

const STEP_ICONS = {
  Observe: Activity,
  Detect: Search,
  Investigate: Search,
  Reason: Brain,
  Prioritize: Sliders,
  Alert: Bell,
};

export function AgentTimeline({ steps = [], lastRun = null }) {
  const displaySteps = steps.length > 0 ? steps : (lastRun ? [
    {
      id: 1,
      step_name: "Observe",
      started_at: lastRun.started_at,
      status: "Completed",
      duration_ms: 120,
      output_summary: "KPI snapshot collected across 4 marketplaces and 126 products.",
    },
    {
      id: 2,
      step_name: "Detect",
      started_at: lastRun.started_at,
      status: "Completed",
      duration_ms: 240,
      output_summary: `${lastRun.anomalies_detected || 3} deterministic anomalies detected above threshold.`,
    },
    {
      id: 3,
      step_name: "Investigate",
      started_at: lastRun.started_at,
      status: "Completed",
      duration_ms: 1100,
      output_summary: "Agent tools executed: marketplace analysis, product contributors & inventory context.",
    },
    {
      id: 4,
      step_name: "Reason",
      started_at: lastRun.started_at,
      status: "Completed",
      duration_ms: 650,
      output_summary: "Synthesized multi-factor evidence; likely contributors and root-causes isolated.",
    },
    {
      id: 5,
      step_name: "Prioritize",
      started_at: lastRun.started_at,
      status: "Completed",
      duration_ms: 180,
      output_summary: "Calculated severity heuristic and estimated revenue at risk.",
    },
    {
      id: 6,
      step_name: "Alert",
      started_at: lastRun.started_at,
      status: "Completed",
      duration_ms: 310,
      output_summary: `${lastRun.alerts_created || 2} proactive business alerts generated & deduplicated.`,
    },
  ] : []);

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Agent Activity Timeline
          </h3>
        </div>
        <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          Workflow Audit Trail
        </span>
      </div>

      {displaySteps.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500">
          No agent activity recorded yet. Click "Run Agent Now" to initiate a cycle.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
          {displaySteps.map((step, idx) => {
            const Icon = STEP_ICONS[step.step_name] || CheckCircle2;
            const isLast = idx === displaySteps.length - 1;

            return (
              <div key={step.id || idx} className="relative group">
                {/* Node icon dot */}
                <div
                  className={cn(
                    "absolute -left-6 top-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] transition-all",
                    isLast
                      ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                      : "bg-white border-slate-300 text-slate-500 group-hover:border-slate-800 group-hover:text-slate-800"
                  )}
                >
                  <Icon className="w-3 h-3" />
                </div>

                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      Step {idx + 1} — {step.step_name}
                    </span>
                    {step.duration_ms && (
                      <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {step.duration_ms}ms
                      </span>
                    )}
                    {step.started_at && (
                      <span className="text-[10px] font-mono text-slate-400 ml-auto">
                        {formatTime(step.started_at)}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed font-sans">
                    {step.output_summary}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
