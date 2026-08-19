import React from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, formatPercent, formatRelativeTime } from "../utils/formatters";
import { 
  ArrowUpRight, 
  Clock, 
  CheckCircle2
} from "lucide-react";
import { cn } from "../utils/cn";

export function AlertTable({ alerts, onStatusChange, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="inline-block w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-slate-500 text-sm">Loading business alerts...</p>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-slate-900 mb-1">No Active Alerts Found</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          All monitored KPIs are operating within normal baseline boundaries.
        </p>
      </div>
    );
  }

  const formatMetricValue = (val, kpi) => {
    if (!val && val !== 0) return "—";
    if (kpi?.includes("revenue") || kpi?.includes("aov") || kpi?.includes("price")) {
      return formatCurrency(val, true);
    }
    if (kpi?.includes("rate") || kpi?.includes("conversion")) {
      return formatPercent(val, false);
    }
    if (kpi?.includes("inventory") || kpi?.includes("stock")) {
      return `${Number(val).toFixed(1)} Days`;
    }
    return Number(val).toLocaleString("en-IN");
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
            <th className="py-3.5 px-4">Severity</th>
            <th className="py-3.5 px-4">Alert / Investigation</th>
            <th className="py-3.5 px-4">KPI</th>
            <th className="py-3.5 px-4">Entity</th>
            <th className="py-3.5 px-4 text-right">Observed</th>
            <th className="py-3.5 px-4 text-right">Expected</th>
            <th className="py-3.5 px-4 text-right">Variance</th>
            <th className="py-3.5 px-4 text-right">Est. Exposure</th>
            <th className="py-3.5 px-4 text-center">Status</th>
            <th className="py-3.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {alerts.map((alert) => (
            <tr
              key={alert.id}
              className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
            >
              {/* Severity */}
              <td className="py-3 px-4 whitespace-nowrap">
                <StatusBadge status={alert.severity} size="xs" />
              </td>

              {/* Title & Summary */}
              <td className="py-3 px-4 min-w-[220px]">
                <Link
                  to={`/alerts/${alert.id}`}
                  className="block font-semibold text-slate-900 group-hover:text-slate-700 transition-colors hover:underline"
                >
                  {alert.title}
                </Link>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{formatRelativeTime(alert.last_detected_at || alert.created_at)}</span>
                  {alert.occurrence_count > 1 && (
                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px]">
                      {alert.occurrence_count}x detected
                    </span>
                  )}
                </div>
              </td>

              {/* KPI */}
              <td className="py-3 px-4 whitespace-nowrap">
                <span className="bg-slate-100 text-slate-700 font-mono text-[11px] px-2 py-0.5 rounded border border-slate-200">
                  {alert.kpi_name?.replace("_", " ")}
                </span>
              </td>

              {/* Entity */}
              <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                {alert.entity_name || "Catalog Level"}
              </td>

              {/* Actual */}
              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                {formatMetricValue(alert.actual_value, alert.kpi_name)}
              </td>

              {/* Expected */}
              <td className="py-3 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                {formatMetricValue(alert.expected_value, alert.kpi_name)}
              </td>

              {/* Deviation */}
              <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded",
                    alert.deviation_pct < 0
                      ? "text-rose-700 bg-rose-50"
                      : "text-emerald-700 bg-emerald-50"
                  )}
                >
                  {formatPercent(alert.deviation_pct)}
                </span>
              </td>

              {/* Impact */}
              <td className="py-3 px-4 text-right font-mono text-slate-900 font-semibold whitespace-nowrap">
                {alert.estimated_impact ? formatCurrency(alert.estimated_impact, true) : "—"}
              </td>

              {/* Status */}
              <td className="py-3 px-4 text-center whitespace-nowrap">
                <StatusBadge status={alert.status} size="xs" />
              </td>

              {/* Actions */}
              <td className="py-3 px-4 text-right whitespace-nowrap">
                <div className="inline-flex items-center gap-1.5">
                  <select
                    value={alert.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      onStatusChange && onStatusChange(alert.id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white text-slate-700 border border-slate-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-slate-800 transition-colors shadow-sm"
                  >
                    <option value="New">New</option>
                    <option value="Investigating">Investigating</option>
                    <option value="Acknowledged">Acknowledge</option>
                    <option value="Resolved">Resolve</option>
                    <option value="Dismissed">Dismiss</option>
                  </select>

                  <Link
                    to={`/alerts/${alert.id}`}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center"
                    title="View Incident Detail"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
