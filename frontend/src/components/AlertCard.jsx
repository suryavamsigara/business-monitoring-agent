import React from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, formatPercent, formatRelativeTime } from "../utils/formatters";
import { ArrowRight, AlertTriangle, Sparkles, TrendingDown, Clock, ShieldAlert } from "lucide-react";
import { cn } from "../utils/cn";

export function AlertCard({ alert, onQuickStatusChange }) {
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
    entity_name,
  } = alert;

  const severityColor = {
    Critical: "border-l-rose-500 bg-rose-500/5 hover:border-rose-500/50",
    High: "border-l-orange-500 bg-orange-500/5 hover:border-orange-500/50",
    Medium: "border-l-amber-500 bg-amber-500/5 hover:border-amber-500/50",
    Low: "border-l-blue-500 bg-blue-500/5 hover:border-blue-500/50",
  }[severity] || "border-l-slate-600 bg-slate-900/50";

  const formatMetric = (val) => {
    if (kpi_name?.includes("revenue") || kpi_name?.includes("price") || kpi_name?.includes("aov")) {
      return formatCurrency(val, true);
    }
    if (kpi_name?.includes("rate") || kpi_name?.includes("conversion")) {
      return formatPercent(val * 100, false);
    }
    return Number(val || 0).toLocaleString("en-IN");
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-800/90 border-l-4 p-5 transition-all duration-200 hover:shadow-lg bg-slate-900/70 relative group",
        severityColor
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <StatusBadge status={severity} size="sm" />
          <StatusBadge status={status} size="sm" />
          <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3 text-slate-500" />
            {formatRelativeTime(last_detected_at || created_at)}
          </span>
        </div>

        <Link
          to={`/alerts/${id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors self-start sm:self-auto"
        >
          Investigate Deep-Dive
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <Link to={`/alerts/${id}`} className="block group-hover:text-amber-300 transition-colors">
        <h3 className="text-base font-bold text-slate-100 mb-1.5 flex items-center gap-2">
          {title}
        </h3>
      </Link>

      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
        {summary || "Automated anomaly detected and evaluated by Business Pulse Agent."}
      </p>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/60 rounded-lg p-3 border border-slate-800/80 text-xs">
        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Actual</div>
          <div className="font-mono font-bold text-slate-100 text-sm mt-0.5">
            {formatMetric(actual_value)}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Expected</div>
          <div className="font-mono font-semibold text-slate-400 text-sm mt-0.5">
            {formatMetric(expected_value)}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Deviation</div>
          <div
            className={cn(
              "font-mono font-bold text-sm mt-0.5 flex items-center gap-0.5",
              deviation_pct < 0 ? "text-rose-400" : "text-emerald-400"
            )}
          >
            {formatPercent(deviation_pct)}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Est. Exposure</div>
          <div className="font-mono font-semibold text-amber-300 text-sm mt-0.5">
            {estimated_impact ? formatCurrency(estimated_impact, true) : "Calculated in run"}
          </div>
        </div>
      </div>
    </div>
  );
}
