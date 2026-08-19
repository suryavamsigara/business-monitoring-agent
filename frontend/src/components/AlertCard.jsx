import React from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, formatPercent, formatRelativeTime } from "../utils/formatters";
import { ArrowRight, Clock } from "lucide-react";
import { cn } from "../utils/cn";

export function AlertCard({ alert }) {
  const {
    id,
    title,
    severity,
    status,
    actual_value,
    expected_value,
    deviation_pct,
    estimated_impact,
    summary,
    created_at,
    last_detected_at,
    kpi_name,
  } = alert;

  const severityBorder = {
    Critical: "border-l-rose-500",
    High: "border-l-orange-500",
    Medium: "border-l-amber-500",
    Low: "border-l-blue-500",
  }[severity] || "border-l-slate-400";

  const isInventory = kpi_name?.includes("inventory") || kpi_name?.includes("stock");
  const isRate = kpi_name?.includes("rate") || kpi_name?.includes("conversion");
  const isCurrency = kpi_name?.includes("revenue") || kpi_name?.includes("price") || kpi_name?.includes("aov");

  const formatMetric = (val) => {
    if (val === null || val === undefined) return "—";
    if (isCurrency) return formatCurrency(val, true);
    if (isRate) return formatPercent(val, false);
    if (isInventory) return `${Number(val).toFixed(1)} Days`;
    return Number(val).toLocaleString("en-IN");
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 border-l-4 p-5 transition-all duration-200 hover:shadow-md bg-white relative group",
        severityBorder
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={severity} size="xs" />
          <StatusBadge status={status} size="xs" />
          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3 text-slate-400" />
            {formatRelativeTime(last_detected_at || created_at)}
          </span>
        </div>

        <Link
          to={`/alerts/${id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-slate-700 transition-colors self-start sm:self-auto"
        >
          View Incident
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <Link to={`/alerts/${id}`} className="block">
        <h3 className="text-base font-bold text-slate-900 mb-1.5 hover:text-slate-700 transition-colors">
          {title}
        </h3>
      </Link>

      <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed font-sans">
        {summary || "Automated anomaly detected and evaluated by Business Pulse Agent."}
      </p>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 rounded-lg p-3 border border-slate-200/80 text-xs">
        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Observed</div>
          <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
            {formatMetric(actual_value)}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Expected</div>
          <div className="font-mono font-medium text-slate-500 text-sm mt-0.5">
            {formatMetric(expected_value)}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Variance</div>
          <div
            className={cn(
              "font-mono font-bold text-sm mt-0.5",
              deviation_pct < 0 ? "text-rose-600" : "text-emerald-600"
            )}
          >
            {formatPercent(deviation_pct)}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Est. Exposure</div>
          <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
            {estimated_impact ? formatCurrency(estimated_impact, true) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
