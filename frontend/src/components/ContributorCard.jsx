import React from "react";
import { Package, ShoppingBag, Layers, AlertTriangle, ArrowUpRight } from "lucide-react";

export function ContributorCard({ contributors = [], alert = {} }) {
  const { kpi_name = "revenue", entity_name, entity_type } = alert;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Affected Entity & Channel Drivers
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Isolated Impact Sources
        </span>
      </div>

      {/* Primary Target Badge */}
      <div className="mb-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
            {entity_type === "product" ? <Package className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Primary Impact Target</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {entity_name || "Catalog Level"}
            </div>
          </div>
        </div>

        <span className="text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
          {entity_type === "product" ? "Active SKU Target" : "Channel Target"}
        </span>
      </div>

      {/* Contributors List */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Specific Contributing Entities
        </div>

        {contributors.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">
            No secondary entity drivers isolated; impact is concentrated on {entity_name || "the primary KPI target"}.
          </p>
        ) : (
          contributors.map((c, idx) => {
            const name = typeof c === "string" ? c : c.name || c.product || JSON.stringify(c);
            const details = typeof c === "object" ? c.details : null;

            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">{name}</h5>
                    {details && <p className="text-[11px] text-slate-400 mt-0.5">{details}</p>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Direct Contributor
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
