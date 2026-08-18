import React from "react";
import { CheckCircle2, ArrowRight, ShieldAlert, Sparkles, Check } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../utils/cn";

export function RecommendationCard({ recommendations = [], severity = "High" }) {
  const getActionType = (idx, text) => {
    const lower = text.toLowerCase();
    if (lower.includes("purchase") || lower.includes("po") || lower.includes("expedite") || lower.includes("replenish")) {
      return { label: "Supply Chain Immediate", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    }
    if (lower.includes("ad") || lower.includes("spend") || lower.includes("ppc") || lower.includes("pause") || lower.includes("campaign")) {
      return { label: "Cost Containment", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    if (lower.includes("feature") || lower.includes("promote") || lower.includes("alternative") || lower.includes("storefront")) {
      return { label: "Demand Recovery", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
    }
    if (idx === 0) return { label: "Priority 1 Action", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    if (idx === 1) return { label: "Channel Adjustment", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    return { label: "Operations Follow-up", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Recommended Action Plan
          </h3>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
          Prioritized Operational Steps
        </span>
      </div>

      {recommendations.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-4">No specific recommendations generated for this alert.</p>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec, idx) => {
            const actionText = typeof rec === "string" ? rec : rec.action || JSON.stringify(rec);
            const tag = getActionType(idx, actionText);

            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[10px] font-mono font-semibold px-2 py-0.5 rounded border", tag.color)}>
                          {tag.label}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed pt-0.5">
                        {actionText}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
