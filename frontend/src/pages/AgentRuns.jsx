import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { agentApi } from "../api/agentApi";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingState } from "../components/LoadingState";
import { formatDateTime, formatRelativeTime } from "../utils/formatters";
import { 
  Terminal, 
  Play, 
  RefreshCw, 
  ArrowRight, 
  Clock, 
  Layers, 
  AlertTriangle, 
  CheckCircle2,
  Calendar
} from "lucide-react";
import { cn } from "../utils/cn";

export function AgentRuns({ onRunNow, isRunning }) {
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRuns = async () => {
    setIsLoading(true);
    try {
      const res = await agentApi.getRuns(50);
      if (res?.runs) {
        setRuns(res.runs);
      }
    } catch (err) {
      console.error("Failed to load agent runs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading agent execution audit history..." />;
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-amber-400" />
            Agent Execution Runs & Audit Trails
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete execution history of autonomous KPI collection, anomaly detection, AI investigations, and proactive alerting.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRuns}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading ? "animate-spin text-amber-400" : "")} />
          </button>

          <button
            onClick={onRunNow}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:from-amber-400"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Trigger Run Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Runs Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Recorded Agent Executions ({runs.length})
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            Full 6-stage lifecycle auditable
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase font-semibold text-[11px]">
                <th className="py-3.5 px-4">Run #ID</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Trigger</th>
                <th className="py-3.5 px-4">Started At</th>
                <th className="py-3.5 px-4 text-center">KPIs Checked</th>
                <th className="py-3.5 px-4 text-center">Anomalies Detected</th>
                <th className="py-3.5 px-4 text-center">Alerts Created</th>
                <th className="py-3.5 px-4 text-right">Audit Trail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                >
                  {/* Run ID */}
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                    <Link to={`/runs/${run.id}`} className="hover:underline">
                      #{run.id}
                    </Link>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusBadge status={run.status} size="sm" />
                  </td>

                  {/* Trigger */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {run.trigger}
                    </span>
                  </td>

                  {/* Started Time */}
                  <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                    {formatDateTime(run.started_at)}
                  </td>

                  {/* KPIs Checked */}
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-300">
                    {run.kpis_checked}
                  </td>

                  {/* Anomalies Detected */}
                  <td className="py-3.5 px-4 text-center font-mono font-bold">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded",
                        run.anomalies_detected > 0
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "text-slate-500"
                      )}
                    >
                      {run.anomalies_detected}
                    </span>
                  </td>

                  {/* Alerts Created */}
                  <td className="py-3.5 px-4 text-center font-mono font-bold">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded",
                        run.alerts_created > 0
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "text-slate-500"
                      )}
                    >
                      {run.alerts_created}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Link
                      to={`/runs/${run.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>View Steps</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
