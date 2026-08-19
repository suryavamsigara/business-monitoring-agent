import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { alertsApi } from "../api/alertsApi";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingState } from "../components/LoadingState";
import { formatCurrency, formatPercent, formatRelativeTime } from "../utils/formatters";
import { 
  ArrowLeft, 
  Bot, 
  Clock, 
  AlertTriangle, 
  Terminal,
  Package,
  Layers,
  CheckCircle2,
  ShieldAlert,
  FileText
} from "lucide-react";
import { cn } from "../utils/cn";
import confetti from "canvas-confetti";

export function AlertDetail({ onOpenAssistantWithContext }) {
  const { alertId } = useParams();
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchAlert = async () => {
    setIsLoading(true);
    try {
      const data = await alertsApi.get(alertId);
      setAlert(data);
    } catch (err) {
      console.error("Failed to load alert detail:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlert();
  }, [alertId]);

  const handleStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    try {
      const updated = await alertsApi.updateStatus(alertId, newStatus);
      if (updated) {
        setAlert((prev) => ({ ...prev, status: newStatus }));
        if (newStatus === "Resolved") {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
          });
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading incident investigation dossier..." />;
  }

  if (!alert) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Alert Not Found</h3>
        <p className="text-xs text-slate-500">The requested alert ID #{alertId} could not be retrieved.</p>
        <Link
          to="/alerts"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Alerts
        </Link>
      </div>
    );
  }

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
    evidence = [],
    recommendations = [],
    occurrence_count = 1,
    created_at,
    last_detected_at,
    run_id,
    kpi_name,
    entity_name,
    entity_type,
  } = alert;

  const isInventory = kpi_name?.includes("inventory") || kpi_name?.includes("stock");
  const isRate = kpi_name?.includes("rate") || kpi_name?.includes("conversion");
  const isCurrency = kpi_name?.includes("revenue") || kpi_name?.includes("aov") || kpi_name?.includes("price");

  const formatMetric = (val) => {
    if (val === null || val === undefined) return "—";
    if (isCurrency) return formatCurrency(val, true);
    if (isRate) return formatPercent(val, false);
    if (isInventory) return `${Number(val).toFixed(1)} Days`;
    return Number(val).toLocaleString("en-IN");
  };

  const getActionBadge = (text, idx) => {
    const lower = String(text).toLowerCase();
    if (lower.includes("purchase") || lower.includes("po") || lower.includes("replenish") || lower.includes("transfer") || lower.includes("supply")) {
      return { label: "Supply Chain", color: "text-rose-700 bg-rose-50 border-rose-200" };
    }
    if (lower.includes("ad") || lower.includes("spend") || lower.includes("pause") || lower.includes("ppc") || lower.includes("campaign")) {
      return { label: "Cost Containment", color: "text-amber-800 bg-amber-50 border-amber-200" };
    }
    if (lower.includes("feature") || lower.includes("promote") || lower.includes("alternative") || lower.includes("storefront") || lower.includes("banner")) {
      return { label: "Demand Capture", color: "text-blue-700 bg-blue-50 border-blue-200" };
    }
    if (idx === 0) return { label: "Immediate Priority", color: "text-rose-700 bg-rose-50 border-rose-200" };
    if (idx === 1) return { label: "Channel Adjustment", color: "text-amber-800 bg-amber-50 border-amber-200" };
    return { label: "Operational Follow-up", color: "text-slate-700 bg-slate-100 border-slate-200" };
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Top Header & Status Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/alerts"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 font-bold uppercase">Incident #{id}</span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-mono text-slate-700 uppercase font-semibold">KPI: {kpi_name?.replace("_", " ")}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {title}
            </h1>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() =>
              onOpenAssistantWithContext &&
              onOpenAssistantWithContext({
                alertId: id,
                runId: run_id,
                alertTitle: title,
              })
            }
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-all shadow-sm"
          >
            <Bot className="w-4 h-4 text-slate-700" />
            <span>Ask Agent Assistant</span>
          </button>

          {/* Status lifecycle actions */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-sm">
            {["New", "Investigating", "Acknowledged", "Resolved", "Dismissed"].map((st) => (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                disabled={isUpdatingStatus}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors text-[11px]",
                  status === st
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Incident Situation Report */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <StatusBadge status={severity} size="sm" />
              <StatusBadge status={status} size="sm" />
              <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Detected {formatRelativeTime(last_detected_at || created_at)}
              </span>
              {occurrence_count > 1 && (
                <span className="text-xs bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded border border-slate-200">
                  Recurring ({occurrence_count} cycles)
                </span>
              )}
            </div>

            <p className="text-base text-slate-800 leading-relaxed font-sans max-w-4xl">
              {summary}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-600" />
                Target Entity: <strong className="text-slate-800">{entity_name || "Catalog Level"}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-600" />
                Scope: <strong className="text-slate-800">{entity_type || "KPI Level"}</strong>
              </span>
              {run_id && (
                <>
                  <span>•</span>
                  <Link to={`/runs/${run_id}`} className="text-slate-700 hover:underline flex items-center gap-1 font-mono font-medium">
                    <Terminal className="w-3.5 h-3.5" /> Agent Run #{run_id}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* 3 Clear Operating Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-left flex-shrink-0 min-w-[340px]">
            <div className="p-2 space-y-1">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Observed Value</div>
              <div className="text-xl font-bold font-mono text-slate-900">
                {formatMetric(actual_value)}
              </div>
              <div className="text-[11px] text-slate-500 font-sans">
                Target: {formatMetric(expected_value)}
              </div>
            </div>

            <div className="p-2 space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-2 sm:pl-3">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Variance Deviation</div>
              <div
                className={cn(
                  "text-xl font-bold font-mono",
                  deviation_pct < 0 ? "text-rose-600" : "text-emerald-600"
                )}
              >
                {formatPercent(deviation_pct)}
              </div>
              <div className="text-[11px] text-slate-500 font-sans">
                vs baseline
              </div>
            </div>

            <div className="p-2 space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-2 sm:pl-3">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Financial Exposure</div>
              <div className="text-xl font-bold font-mono text-slate-900">
                {estimated_impact ? formatCurrency(estimated_impact, true) : "—"}
              </div>
              <div className="text-[11px] text-slate-500 font-sans">
                Projected impact
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Investigation Evidence & Diagnostics */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Investigation Findings & Channel Diagnostics
            </h3>
          </div>
        </div>

        {evidence.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-3">No specific diagnostics recorded for this incident.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {evidence.map((item, idx) => {
              const text = typeof item === "string" ? item : JSON.stringify(item);
              const parts = text.split(/:\s*(.+)/);
              const hasPrefix = parts.length >= 2 && parts[0].length < 40 && !parts[0].includes("http");

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="text-xs leading-relaxed font-sans">
                    {hasPrefix ? (
                      <div>
                        <div className="font-bold text-slate-900">{parts[0]}</div>
                        <p className="text-slate-600 mt-1">{parts[1]}</p>
                      </div>
                    ) : (
                      <p className="text-slate-700">{text}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prescriptive Operational Action Plan */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Immediate Operational Action Plan
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 font-medium">
            Execution Ready
          </span>
        </div>

        {recommendations.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-3">No specific recommendations recorded for this incident.</p>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, idx) => {
              const actionText = typeof rec === "string" ? rec : rec.action || JSON.stringify(rec);
              const badge = getActionBadge(actionText, idx);

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-mono font-semibold px-2 py-0.5 rounded border", badge.color)}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed pt-0.5">
                        {actionText}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
