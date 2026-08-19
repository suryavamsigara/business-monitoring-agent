import React, { useState, useEffect } from "react";
import { Activity, Search, RefreshCw } from "lucide-react";

const DEFAULT_MESSAGES = [
  "Connecting to telemetry engines...",
  "Ingesting multi-channel sales & inventory streams...",
  "Evaluating 30-day rolling baselines & z-score thresholds...",
  "Checking stock levels, conversion rates & return metrics...",
  "Synthesizing autonomous KPI health diagnostics...",
];

export function LoadingState({ 
  message = null, 
  messages = DEFAULT_MESSAGES,
  title = "Business Pulse Telemetry" 
}) {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (message) return; // If a static single message is passed, don't cycle
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % messages.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [message, messages]);

  const displayMessage = message || messages[currentIdx];

  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[340px] text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm relative">
        <Activity className="w-6 h-6 animate-pulse text-slate-800" />
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h4 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h4>
        <p className="text-xs text-slate-500 font-mono transition-all duration-300 min-h-[1.25rem] flex items-center justify-center gap-1.5">
          <RefreshCw className="w-3 h-3 animate-spin text-slate-400 inline" />
          <span>{displayMessage}</span>
        </p>
      </div>

      {/* Dynamic progress indicators */}
      <div className="w-56 space-y-2 pt-2">
        <div className="h-1.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-slate-900 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${Math.min(100, ((currentIdx + 1) / messages.length) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
          <span>Step {currentIdx + 1} of {messages.length}</span>
          <span>{Math.round(((currentIdx + 1) / messages.length) * 100)}%</span>
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
