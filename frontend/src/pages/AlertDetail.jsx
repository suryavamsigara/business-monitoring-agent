import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { alertsApi } from "../api/alertsApi";
import { AnomalyChart } from "../components/AnomalyChart";
import { EvidenceCard } from "../components/EvidenceCard";
import { ContributorCard } from "../components/ContributorCard";
import { RecommendationCard } from "../components/RecommendationCard";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingState } from "../components/LoadingState";
import { formatCurrency, formatPercent, formatRelativeTime, formatDateTime } from "../utils/formatters";
import { 
  ArrowLeft, 
  Bot, 
  Sparkles, 
  Clock, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  TrendingDown, 
  ExternalLink,
  ShieldAlert,
  Flame,
  Terminal
} from "lucide-react";
import { cn } from "../utils/cn";
import confetti from "canvas-confetti";

export function AlertDetail({ onOpenAssistantWithContext }) {
  const { alertId } = useParams();
  const navigate = useNavigate();
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
    return <LoadingState message="Loading autonomous investigation dossier..." />;
  }

  if (!alert) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Alert Not Found</h3>
        <p className="text-xs text-slate-400">The requested alert ID #{alertId} could not be retrieved.</p>
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
    contributors = [],
    recommendations = [],
    confidence = 0.85,
    ai_mode = "llm",
    occurrence_count = 1,
    created_at,
    last_detected_at,
    run_id,
    history = [],
    kpi_name,
    entity_name,
    entity_type,
  } = alert;

  const formatMetric = (val) => {
    if (!val && val !== 0) return "—";
    if (kpi_name?.includes("revenue") || kpi_name?.includes("aov") || kpi_name?.includes("price")) {
      return formatCurrency(val, true);
    }
    if (kpi_name?.includes("rate") || kpi_name?.includes("conversion")) {
      return formatPercent(val * 100, false);
    }
    return Number(val).toLocaleString("en-IN");
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Breadcrumb & Status Navigation */}
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
              <span className="text-[11px] font-mono text-slate-500 uppercase">Alert #{id}</span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] font-mono text-amber-400">KPI: {kpi_name}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
              {title}
            </h1>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Ask Assistant CTA */}
          <button
            onClick={() =>
              onOpenAssistantWithContext &&
              onOpenAssistantWithContext({
                alertId: id,
                runId: run_id,
                alertTitle: title,
              })
            }
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 hover:border-amber-500/60 text-amber-300 text-xs font-semibold transition-all shadow-sm"
          >
            <Bot className="w-4 h-4 text-amber-400" />
            <span>Ask Agent About This Alert</span>
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

      {/* Hero Anomaly Summary Card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <StatusBadge status={severity} size="md" />
              <StatusBadge status={status} size="md" />
              <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Detected {formatRelativeTime(last_detected_at || created_at)}
              </span>
              {occurrence_count > 1 && (
                <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                  Deduplicated ({occurrence_count} monitoring cycles)
                </span>
              )}
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-sans max-w-3xl">
              {summary}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span>Entity: <strong className="text-slate-200">{entity_name || "Business-wide"}</strong></span>
              <span>•</span>
              <span>Type: <strong className="text-slate-200">{entity_type || "KPI"}</strong></span>
              {run_id && (
                <>
                  <span>•</span>
                  <Link to={`/runs/${run_id}`} className="text-amber-400 hover:underline flex items-center gap-1">
                    <Terminal className="w-3 h-3" /> Agent Run #{run_id}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* 4 Quantitative Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center flex-shrink-0">
            <div className="px-2">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Actual</div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                {formatMetric(actual_value)}
              </div>
            </div>

            <div className="px-2 border-l border-slate-800">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Expected</div>
              <div className="text-lg font-semibold font-mono text-slate-400 mt-0.5">
                {formatMetric(expected_value)}
              </div>
            </div>

            <div className="px-2 border-l border-slate-800">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Deviation</div>
              <div
                className={cn(
                  "text-lg font-bold font-mono mt-0.5",
                  deviation_pct < 0 ? "text-rose-400" : "text-emerald-400"
                )}
              >
                {formatPercent(deviation_pct)}
              </div>
            </div>

            <div className="px-2 border-l border-slate-800">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Est. Exposure</div>
              <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                {estimated_impact ? formatCurrency(estimated_impact, true) : "Calculated in run"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Visual Chart: Actual vs Expected */}
      <AnomalyChart
        data={history}
        kpiName={kpi_name}
        expectedValue={expected_value}
        title={`Historical Actual vs Expected Baseline — ${title}`}
      />

      {/* 2-Column Grid: Evidence Synthesis & Contributor Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EvidenceCard
          evidence={evidence}
          aiMode={ai_mode}
          confidence={confidence}
        />

        <ContributorCard
          contributors={contributors}
          alert={alert}
        />
      </div>

      {/* Prescriptive Interventions / Recommendations */}
      <RecommendationCard
        recommendations={recommendations}
        severity={severity}
      />
    </div>
  );
}
