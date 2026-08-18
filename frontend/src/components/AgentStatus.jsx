import React from "react";
import { formatTime, formatRelativeTime } from "../utils/formatters";
import { 
  Play, 
  RefreshCw, 
  Activity, 
  Layers, 
  Store, 
  Package, 
  Clock, 
  CheckCircle,
  AlertCircle
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-6 shadow-2xl">
      {/* Ambient background glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Agent State & Schedule */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>{active ? "Agent Active" : "Agent Paused"}</span>
            </div>

            <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Interval: Every 15 mins
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              Business Pulse Agent
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                v1.0 Autonomous
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Autonomous KPI monitoring, multi-method anomaly detection, and AI-driven root-cause investigation for marketplace operations.
            </p>
          </div>

          {/* Schedule info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            {last_run && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Last run:</span>
                <span className="text-slate-200 font-medium font-mono">
                  {formatRelativeTime(last_run.completed_at || last_run.started_at)}
                </span>
                <span className="text-[11px] text-slate-500">
                  ({last_run.anomalies_detected} anomalies, {last_run.alerts_created} alerts)
                </span>
              </div>
            )}

            {next_run_time && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">• Next scheduled:</span>
                <span className="text-slate-200 font-medium font-mono">
                  {formatTime(next_run_time)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Monitoring stats & CTA */}
        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-4">
          {/* Stats pills */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950/70 rounded-xl p-2.5 border border-slate-800 text-center">
            <div className="px-3 py-1.5">
              <div className="text-base font-bold text-amber-400 font-mono">{kpis_monitored}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">KPIs</div>
            </div>
            <div className="px-3 py-1.5 border-x border-slate-800">
              <div className="text-base font-bold text-blue-400 font-mono">{marketplaces_monitored}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Marketplaces</div>
            </div>
            <div className="px-3 py-1.5">
              <div className="text-base font-bold text-emerald-400 font-mono">{products_monitored}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">SKUs</div>
            </div>
          </div>

          {/* Big CTA */}
          <button
            onClick={onRunNow}
            disabled={isRunning}
            className={cn(
              "relative inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-xl",
              isRunning
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 hover:shadow-amber-500/40 active:scale-[0.98]"
            )}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
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
        <div className="mt-5 pt-4 border-t border-slate-800 text-xs flex items-center justify-between gap-3 text-amber-300 font-mono animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{runProgress || "Executing workflow: Observe → Detect → Investigate → Reason → Prioritize → Alert"}</span>
          </div>
          <span className="text-[11px] text-slate-400">Processing real business data...</span>
        </div>
      )}
    </div>
  );
}
