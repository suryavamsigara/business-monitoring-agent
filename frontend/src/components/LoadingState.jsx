import React from "react";
import { RefreshCw, Activity, Search } from "lucide-react";

export function LoadingState({ message = "Gathering telemetry and running deterministic models..." }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[300px] text-center space-y-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-amber-500/20 blur animate-pulse" />
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-bold text-slate-200">Business Pulse Telemetry</h4>
        <p className="text-xs text-slate-400 max-w-sm">{message}</p>
      </div>

      {/* Shimmer skeleton bars */}
      <div className="w-48 space-y-2 pt-2">
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500/50 rounded-full animate-[shimmer_1.5s_infinite] w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ 
  title = "No Data Found", 
  message = "No records matched the current filter criteria.",
  icon: Icon = Search,
  actionText = null,
  onAction = null
}) {
  return (
    <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
      <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">{message}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
