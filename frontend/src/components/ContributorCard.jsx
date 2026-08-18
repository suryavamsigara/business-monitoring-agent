import React from "react";
import { GitBranch, ChevronDown, Package, ArrowDownRight, ArrowRight, Layers, AlertTriangle } from "lucide-react";
import { cn } from "../utils/cn";

export function ContributorCard({ contributors = [], alert = {} }) {
  const { kpi_name = "revenue", deviation_pct = -15, entity_name } = alert;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Likely Contributor Breakdown & Flow
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Data-driven contributor hypotheses
        </span>
      </div>

      {/* Root-Cause Visual Decomposition Flow */}
      <div className="mb-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <span>Signal Decomposition Flow</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-500 font-normal normal-case">Observed telemetry downstream path</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 overflow-x-auto py-2">
          {/* Level 1: Macro Anomaly */}
          <div className="w-full sm:w-auto flex-1 min-w-[140px] p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-center">
            <div className="text-[10px] uppercase font-bold text-rose-400">Primary Anomaly</div>
            <div className="text-xs font-mono font-bold text-white mt-0.5">
              {alert.title || `${kpi_name} (${deviation_pct}%)`}
            </div>
          </div>

          <div className="text-slate-600 sm:rotate-0 rotate-90 flex-shrink-0">
            <ArrowRight className="w-4 h-4 text-slate-500" />
          </div>

          {/* Level 2: Business Driver */}
          <div className="w-full sm:w-auto flex-1 min-w-[140px] p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
            <div className="text-[10px] uppercase font-bold text-amber-400">Telemetry Signal</div>
            <div className="text-xs font-mono font-bold text-white mt-0.5">
              {kpi_name === "revenue" ? "Orders & Conversion Divergence" : "Supply & Return Variance"}
            </div>
          </div>

          <div className="text-slate-600 sm:rotate-0 rotate-90 flex-shrink-0">
            <ArrowRight className="w-4 h-4 text-slate-500" />
          </div>

          {/* Level 3: Isolated Entity Contributors */}
          <div className="w-full sm:w-auto flex-1 min-w-[150px] p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-center">
            <div className="text-[10px] uppercase font-bold text-purple-400">Isolated Drivers</div>
            <div className="text-xs font-mono font-bold text-white mt-0.5 truncate">
              {contributors.length > 0
                ? `${contributors.length} SKU / Channel Targets`
                : entity_name || "Catalog Level"}
            </div>
          </div>
        </div>
      </div>

      {/* Ranked Contributors List */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Ranked Contributor Entities
        </h4>

        {contributors.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">
            No specific product or marketplace entity exceeded the contribution threshold individually.
          </p>
        ) : (
          contributors.map((c, idx) => {
            const name = typeof c === "string" ? c : c.name || c.product || JSON.stringify(c);
            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800/90 hover:border-purple-500/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-100">{name}</h5>
                    {c.details && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{c.details}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    Likely Contributor
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
