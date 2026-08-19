import React from "react";
import { formatTime, formatRelativeTime } from "../utils/formatters";
import { 
  Play, 
  RefreshCw, 
  Clock
} from "lucide-react";
import { cn } from "../utils/cn";

export function AgentStatus({ 
  status, 
  onRunNow, 
  isRunning = false, 
  runProgress = null 
}) {
  const {
    active = true,
    last_run,
    next_run_time,
    kpis_monitored = 8,
    marketplaces_monitored = 4,
    products_monitored = 126,
  } = status || {};

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Agent State & Schedule */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{active ? "Agent Active" : "Agent Paused"}</span>
            </div>

            <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Interval: Every 15 mins
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              Business Pulse Agent
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                v1.0 Autonomous
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Autonomous KPI monitoring, deterministic anomaly detection, and AI-driven root-cause investigation.
            </p>
          </div>

          {/* Schedule info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            {last_run && (
              <div className="flex items-center gap-1.5">
                <span>Last run:</span>
                <span className="text-slate-800 font-medium font-mono">
                  {formatRelativeTime(last_run.completed_at || last_run.started_at)}
                </span>
                <span className="text-[11px] text-slate-500">
                  ({last_run.anomalies_detected} anomalies, {last_run.alerts_created} alerts)
                </span>
              </div>
            )}

            {next_run_time && (
              <div className="flex items-center gap-1.5">
                <span>• Next scheduled:</span>
                <span className="text-slate-800 font-medium font-mono">
                  {formatTime(next_run_time)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Monitoring stats & CTA */}
        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-4">
          {/* Stats pills */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-center">
            <div className="px-3 py-1.5">
              <div className="text-lg font-bold text-slate-900 font-mono">{kpis_monitored}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">KPIs</div>
            </div>
            <div className="px-3 py-1.5 border-x border-slate-200">
              <div className="text-lg font-bold text-slate-900 font-mono">{marketplaces_monitored}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Channels</div>
            </div>
            <div className="px-3 py-1.5">
              <div className="text-lg font-bold text-slate-900 font-mono">{products_monitored}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">SKUs</div>
            </div>
          </div>

          {/* Big CTA */}
          <button
            onClick={onRunNow}
            disabled={isRunning}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-xs transition-all shadow-sm",
              isRunning
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                : "bg-slate-900 hover:bg-slate-800 text-white active:scale-98"
            )}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                <span>Running Agent...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Agent Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time agent progress feedback if running */}
      {isRunning && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs flex items-center justify-between gap-3 text-slate-700 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping" />
            <span>{runProgress || "Executing workflow: Observe → Detect → Investigate → Reason → Prioritize → Alert"}</span>
          </div>
          <span className="text-[11px] text-slate-500">Processing telemetry...</span>
        </div>
      )}
    </div>
  );
}
