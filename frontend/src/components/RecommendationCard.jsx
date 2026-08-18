import React from "react";
import { Lightbulb, CheckCircle, ArrowRight, ShieldCheck, Target, Zap } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../utils/cn";

export function RecommendationCard({ recommendations = [], severity = "High" }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Actionable Prescriptions & Recommendations
          </h3>
        </div>
        <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          Proactive Interventions
        </span>
      </div>

      {recommendations.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-4">No proactive recommendations generated for this run.</p>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec, idx) => {
            const actionText = typeof rec === "string" ? rec : rec.action || JSON.stringify(rec);
            const priority = typeof rec === "object" && rec.priority ? rec.priority : severity;
            const reason = typeof rec === "object" && rec.reason ? rec.reason : null;
            const expectedImpact = typeof rec === "object" && rec.expected_impact ? rec.expected_impact : null;

            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-amber-500/40 transition-colors relative group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                      {actionText}
                    </h4>
                  </div>
                  <StatusBadge status={priority} size="xs" />
                </div>

                {reason && (
                  <div className="text-xs text-slate-400 mb-2 pl-7 flex items-start gap-1.5">
                    <span className="font-semibold text-slate-300">Rationale:</span>
                    <span>{reason}</span>
                  </div>
                )}

                {expectedImpact && (
                  <div className="text-xs text-emerald-400/90 pl-7 flex items-center gap-1.5 font-medium">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Expected Benefit: {expectedImpact}</span>
                  </div>
                )}

                <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 pl-7">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Targeted Operations Playbook
                  </span>
                  <span className="text-slate-400 font-mono">Immediate Execution Ready</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
