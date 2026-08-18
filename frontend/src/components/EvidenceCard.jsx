import React from "react";
import { 
  FileText, 
  Package, 
  ShoppingBag, 
  Users, 
  Layers, 
  Sparkles
} from "lucide-react";

export function EvidenceCard({ evidence = [], aiMode = "llm", confidence = 0.85 }) {
  const getIconForEvidence = (text) => {
    const lower = String(text).toLowerCase();
    if (lower.includes("traffic") || lower.includes("visit") || lower.includes("click")) return Users;
    if (lower.includes("order") || lower.includes("sales") || lower.includes("revenue")) return ShoppingBag;
    if (lower.includes("stock") || lower.includes("inventory") || lower.includes("days")) return Package;
    if (lower.includes("marketplace") || lower.includes("channel")) return Layers;
    return Sparkles;
  };

  const formatEvidenceText = (item) => {
    if (typeof item !== "string") {
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    }
    const parts = item.split(/:\s*(.+)/);
    if (parts.length >= 2 && parts[0].length < 40 && !parts[0].includes("http")) {
      return (
        <span>
          <span className="font-semibold text-cyan-300 mr-1">{parts[0]}:</span>
          <span className="text-slate-300">{parts[1]}</span>
        </span>
      );
    }
    return <span className="text-slate-300">{item}</span>;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Autonomous Evidence Synthesis
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            {aiMode === "llm" ? "AI Tool Reasoning" : "Deterministic Signals"}
          </span>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            Confidence: {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>

      {evidence.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-4">No specific evidence points recorded for this anomaly.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {evidence.map((item, idx) => {
            const rawText = typeof item === "string" ? item : JSON.stringify(item);
            const Icon = getIconForEvidence(rawText);

            return (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="w-6 h-6 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs leading-relaxed font-sans">
                  {formatEvidenceText(item)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
