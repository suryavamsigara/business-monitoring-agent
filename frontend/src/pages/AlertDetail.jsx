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
  Sparkles,
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
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Alert Not Found</h3>
        <p className="text-xs text-slate-400">The requested alert ID #{alertId} could not be retrieved from Supabase.</p>
        <Link
          to="/alerts"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
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
    confidence = 0.88,
    ai_mode = "llm",
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
    if (isRate) return formatPercent(val * 100, false);
    if (isInventory) return `${Number(val).toFixed(1)} Days`;
    return Number(val).toLocaleString("en-IN");
  };

  const getActionBadge = (text, idx) => {
    const lower = String(text).toLowerCase();
    if (lower.includes("purchase") || lower.includes("po") || lower.includes("replenish") || lower.includes("transfer") || lower.includes("supply")) {
      return { label: "Supply Chain", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    }
    if (lower.includes("ad") || lower.includes("spend") || lower.includes("pause") || lower.includes("ppc") || lower.includes("campaign")) {
      return { label: "Cost Containment", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    if (lower.includes("feature") || lower.includes("promote") || lower.includes("alternative") || lower.includes("storefront") || lower.includes("banner")) {
      return { label: "Demand Capture", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
    }
    if (idx === 0) return { label: "Immediate Priority", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    if (idx === 1) return { label: "Channel Adjustment", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    return { label: "Operational Follow-up", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Top Header & Status Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/alerts"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 font-bold uppercase">Incident #{id}</span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] font-mono text-amber-400 uppercase font-semibold">KPI: {kpi_name?.replace("_", " ")}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
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
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:border-amber-500/60 text-amber-300 text-xs font-semibold transition-all shadow-sm"
          >
            <Bot className="w-4 h-4 text-amber-400" />
            <span>Ask Agent Assistant</span>
          </button>

          {/* Status lifecycle actions */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {["New", "Investigating", "Acknowledged", "Resolved", "Dismissed"].map((st) => (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                disabled={isUpdatingStatus}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-colors text-[11px]",
                  status === st
                    ? "bg-slate-800 text-white font-bold shadow"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Incident Situation Report */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <StatusBadge status={severity} size="md" />
              <StatusBadge status={status} size="md" />
              <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Detected {formatRelativeTime(last_detected_at || created_at)}
              </span>
              {occurrence_count > 1 && (
                <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2.5 py-0.5 rounded-md border border-slate-700">
                  Recurring ({occurrence_count} cycles)
                </span>
              )}
            </div>

            <p className="text-base text-slate-200 leading-relaxed font-sans max-w-4xl">
              {summary}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-cyan-400" />
                Target Entity: <strong className="text-slate-200">{entity_name || "Catalog Level"}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Scope: <strong className="text-slate-200">{entity_type || "KPI Level"}</strong>
              </span>
              {run_id && (
                <>
                  <span>•</span>
                  <Link to={`/runs/${run_id}`} className="text-amber-400 hover:underline flex items-center gap-1 font-mono">
                    <Terminal className="w-3.5 h-3.5" /> Agent Run #{run_id}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* 3 Clear Operating Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/90 text-left flex-shrink-0 min-w-[340px]">
            <div className="p-2 space-y-1">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Observed Value</div>
              <div className="text-xl font-bold font-mono text-white">
                {formatMetric(actual_value)}
              </div>
              <div className="text-[11px] text-slate-500 font-sans">
                Target: {formatMetric(expected_value)}
              </div>
            </div>

            <div className="p-2 space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-2 sm:pl-3">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Variance Deviation</div>
              <div
                className={cn(
                  "text-xl font-bold font-mono",
                  deviation_pct < 0 ? "text-rose-400" : "text-emerald-400"
                )}
              >
                {formatPercent(deviation_pct)}
              </div>
              <div className="text-[11px] text-slate-500 font-sans">
                vs expected baseline
              </div>
            </div>

            <div className="p-2 space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-2 sm:pl-3">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Financial Exposure</div>
              <div className="text-xl font-bold font-mono text-amber-300">
                {estimated_impact ? formatCurrency(estimated_impact, true) : "—"}
              </div>
              <div className="text-[11px] text-slate-500 font-sans">
                Projected impact
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Investigation Evidence & Root-Cause Signals */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
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
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="text-xs leading-relaxed font-sans">
                    {hasPrefix ? (
                      <div>
                        <div className="font-bold text-slate-200">{parts[0]}</div>
                        <p className="text-slate-400 mt-1">{parts[1]}</p>
                      </div>
                    ) : (
                      <p className="text-slate-300">{text}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prescriptive Operational Action Plan */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Immediate Operational Action Plan
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
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
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 flex items-start justify-between gap-4 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-mono font-semibold px-2 py-0.5 rounded border", badge.color)}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed pt-0.5">
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
