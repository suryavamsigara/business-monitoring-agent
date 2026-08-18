import React, { useState } from "react";
import { dashboardApi } from "../api/dashboardApi";
import { 
  Play, 
  FlaskConical, 
  X, 
  AlertTriangle, 
  TrendingDown, 
  Percent, 
  Package, 
  RotateCcw, 
  Layers,
  Sparkles,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { cn } from "../utils/cn";

const SCENARIOS = [
  {
    id: "revenue_drop",
    title: "Amazon Revenue Anomaly",
    category: "Commercial Anomaly",
    description: "Forces a sudden 35% revenue decline on Amazon channel due to order compression.",
    target: "Amazon Marketplace",
    icon: TrendingDown,
    color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  },
  {
    id: "conversion_drop",
    title: "EcoRunner Conversion Decline",
    category: "Customer Behavior",
    description: "Traffic remains stable while conversion drops by ~35%, triggering compound anomaly detection.",
    target: "EcoRunner Slip-on",
    icon: Percent,
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  {
    id: "stockout_risk",
    title: "Runner Pro Stock-Out Risk",
    category: "Inventory Telemetry",
    description: "Inventory falls to under 10 units (< 2.3 days of stock) for high-velocity top-selling SKU.",
    target: "Runner Pro (Footwear)",
    icon: Package,
    color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  },
  {
    id: "return_spike",
    title: "Heritage Loafer Return Rate Spike",
    category: "Product Quality",
    description: "Product returns surge above 20%, breaching the statistical quality threshold.",
    target: "Heritage Loafer",
    icon: RotateCcw,
    color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  },
  {
    id: "excess_inventory",
    title: "CoastalWalk Excess Inventory",
    category: "Supply Chain",
    description: "Stock balloons to 2,800 units with low sales velocity, creating working capital lockup.",
    target: "CoastalWalk Sandals",
    icon: Layers,
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
];

export function DemoControlsModal({ isOpen, onClose, onScenarioSimulated }) {
  const [selectedScenario, setSelectedScenario] = useState("revenue_drop");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setIsSimulating(true);
    setSimResult(null);

    try {
      const res = await dashboardApi.simulateScenario(selectedScenario);
      setSimResult(res);
      if (onScenarioSimulated) {
        onScenarioSimulated(res);
      }
    } catch (err) {
      setSimResult({
        status: "error",
        message: `Simulation failed: ${err.message}`,
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Live Demo Scenario Simulator</h3>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Evaluator Sandbox
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inject deterministic business anomalies into the live synthetic database to observe agent detection.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenario List */}
        <div className="p-5 space-y-3 max-h-[460px] overflow-y-auto">
          {SCENARIOS.map((scenario) => {
            const Icon = scenario.icon;
            const isSelected = selectedScenario === scenario.id;

            return (
              <div
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario.id)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer relative",
                  isSelected
                    ? "bg-purple-950/30 border-purple-500/80 shadow-md shadow-purple-500/10"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center border",
                        scenario.color
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100">
                        {scenario.title}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        Target: {scenario.target}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      isSelected
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    )}
                  >
                    {scenario.category}
                  </span>
                </div>

                <p className="text-xs text-slate-400 pl-9 leading-relaxed">
                  {scenario.description}
                </p>
              </div>
            );
          })}

          {/* Feedback banner after simulation */}
          {simResult && (
            <div
              className={cn(
                "p-3.5 rounded-xl border text-xs flex items-start gap-2.5",
                simResult.status === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              )}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">{simResult.message}</div>
                {simResult.run_result && (
                  <div className="text-[11px] font-mono mt-1 text-slate-300">
                    Run #{simResult.run_result.run_id} created • {simResult.run_result.anomalies_detected} anomalies detected.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Close
          </button>

          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className={cn(
              "px-5 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 shadow-lg",
              isSimulating
                ? "bg-purple-500/30 text-purple-300 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-purple-500/20 active:scale-[0.98]"
            )}
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Simulating & Executing Agent...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Simulate Event & Detect</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
