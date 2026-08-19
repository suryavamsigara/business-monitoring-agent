import React from "react";
import { Activity, Search } from "lucide-react";

export function LoadingState({ message = "Gathering telemetry and running deterministic models..." }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[300px] text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shadow-sm">
        <Activity className="w-6 h-6 animate-pulse" />
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-bold text-slate-900">Business Pulse Telemetry</h4>
        <p className="text-xs text-slate-500 max-w-sm">{message}</p>
      </div>

      {/* Shimmer skeleton bars */}
      <div className="w-48 space-y-2 pt-2">
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-slate-800 rounded-full animate-pulse w-2/3" />
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
    <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-3 shadow-sm">
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">{message}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-colors shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
