import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { agentApi } from "../api/agentApi";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingState } from "../components/LoadingState";
import { formatDateTime } from "../utils/formatters";
import { 
  Terminal, 
  Play, 
  RefreshCw, 
  ArrowRight 
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-slate-800" />
            Agent Execution Runs & Audit Trails
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete execution history of autonomous KPI collection, anomaly detection, AI investigations, and proactive alerting.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRuns}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading ? "animate-spin text-slate-900" : "")} />
          </button>

          <button
            onClick={onRunNow}
            disabled={isRunning}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition-all shadow-sm",
              isRunning
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                : "bg-slate-900 hover:bg-slate-800 text-white active:scale-98"
            )}
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
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Recorded Agent Executions ({runs.length})
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            Full 6-stage lifecycle auditable
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 uppercase font-semibold text-[11px]">
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
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                >
                  {/* Run ID */}
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    <Link to={`/runs/${run.id}`} className="hover:underline">
                      #{run.id}
                    </Link>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusBadge status={run.status} size="xs" />
                  </td>

                  {/* Trigger */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {run.trigger}
                    </span>
                  </td>

                  {/* Started Time */}
                  <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                    {formatDateTime(run.started_at)}
                  </td>

                  {/* KPIs Checked */}
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-800">
                    {run.kpis_checked}
                  </td>

                  {/* Anomalies Detected */}
                  <td className="py-3.5 px-4 text-center font-mono font-bold">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded",
                        run.anomalies_detected > 0
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "text-slate-400"
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
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "text-slate-400"
                      )}
                    >
                      {run.alerts_created}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Link
                      to={`/runs/${run.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-slate-700 group-hover:translate-x-0.5 transition-transform"
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
